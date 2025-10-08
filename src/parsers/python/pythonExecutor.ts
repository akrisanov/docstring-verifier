import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import { Logger } from '../../utils/logger';

/**
 * Result of executing Python script
 */
export interface PythonExecutionResult {
	success: boolean;
	stdout: string;
	stderr: string;
	exitCode: number | null;
}

/**
 * Configuration for Python execution
 */
export interface PythonExecutorConfig {
	/** Prefer using uv if available */
	preferUv?: boolean;
	/** Custom Python path (overrides auto-detection) */
	pythonPath?: string;
	/** Timeout in milliseconds */
	timeout?: number;
	/** Working directory */
	cwd?: string;
}

/**
 * Platform-specific uv download information
 */
interface UvDownloadInfo {
	url: string;
	filename: string;
	executable: string;
}

/**
 * Executes Python scripts with uv/python detection and error handling.
 * Responsible for subprocess management and output parsing.
 *
 * Features:
 * - Lazy download of uv binary (platform-specific, ~12 MB)
 * - Saves to extension global storage
 * - Priority: bundled uv → system uv → Python Extension API → system python3
 *
 * TODO (Post-MVP): Performance optimizations for subprocess execution
 * Current approach spawns new Python process for each file (~100-400ms overhead):
 * - Process creation: 10-50ms
 * - Python interpreter load: 50-200ms
 * - Module imports (ast, json): 20-100ms
 * - Actual parsing: 10-50ms
 *
 * Possible optimizations:
 * 1. **Persistent Python REPL** (Best ROI, ~5-10x speedup)
 *    - Keep single Python process alive
 *    - Send commands via stdin, read results from stdout
 *    - Reduces overhead from 400ms → ~50ms per file
 *    - Challenge: Error recovery, process lifecycle management
 *
 * 2. **WebAssembly Python** (Future-proof, ~10-20x speedup)
 *    - Use Pyodide or MicroPython compiled to WASM
 *    - Run Python in same Node.js process (no IPC)
 *    - Reduces overhead from 400ms → ~5-10ms per file
 *    - Challenge: Bundle size (~8-15MB), limited stdlib
 *
 * 3. **Batch processing** (Simple, ~2x speedup)
 *    - Modify ast_extractor.py to accept multiple files
 *    - Parse all workspace files in one subprocess call
 *    - Reduces overhead from 400ms × N → 400ms total
 *    - Challenge: Workspace-wide analysis may be slow
 *
 * 4. **Native parser** (Most complex, ~50-100x speedup)
 *    - Implement Python AST parser in TypeScript/Rust
 *    - Use tree-sitter-python for incremental parsing
 *    - Reduces overhead from 400ms → ~5ms per file
 *    - Challenge: High maintenance cost, language feature parity
 *
 * Note: Analysis itself is fast (~2ms for 20 functions).
 * Subprocess overhead is the real bottleneck (99.5% of total time).
 */
export class PythonExecutor {
	private static readonly UV_VERSION = '0.4.30';
	private static readonly DOWNLOAD_TIMEOUT_MS = 60000; // 60 seconds
	private static readonly MAX_DOWNLOAD_RETRIES = 5;

	private logger: Logger;
	private pythonCommand: string[] | null = null;
	private context: vscode.ExtensionContext;
	private uvDownloadInProgress = false;
	private uvDownloadPromise: Promise<string | null> | null = null;

	constructor(
		context: vscode.ExtensionContext,
		private config: PythonExecutorConfig = {}
	) {
		this.logger = new Logger('Docstring Verifier - Python Executor');
		this.context = context;
	}

	/**
	 * Detect and cache the Python command to use.
	 * Priority: bundled uv → system uv → Python Extension API → system python3
	 */
	private async detectPythonCommand(): Promise<string[]> {
		if (this.pythonCommand) {
			return this.pythonCommand;
		}

		// 1. Use custom pythonPath if provided
		if (this.config.pythonPath) {
			this.logger.info(`Using custom Python path: ${this.config.pythonPath}`);
			this.pythonCommand = [this.config.pythonPath];
			return this.pythonCommand;
		}

		// 2. Try bundled uv (lazy download if needed)
		if (this.config.preferUv !== false) {
			const bundledUvPath = await this.getBundledUvPath();
			if (bundledUvPath) {
				this.logger.info('Using bundled uv for Python execution');
				this.pythonCommand = [bundledUvPath, 'run', 'python'];
				return this.pythonCommand;
			}
		}

		// 3. Try system uv
		if (this.config.preferUv !== false) {
			const uvAvailable = await this.isCommandAvailable('uv');
			if (uvAvailable) {
				this.logger.info('Using system uv for Python execution');
				this.pythonCommand = ['uv', 'run', 'python'];
				return this.pythonCommand;
			}
		}

		// 4. Try Python Extension API
		const pythonExtensionPath = await this.getPythonFromExtension();
		if (pythonExtensionPath) {
			this.logger.info('Using Python Extension API for Python execution');
			this.pythonCommand = [pythonExtensionPath];
			return this.pythonCommand;
		}

		// 5. Fallback to system python3
		this.logger.info('Using system python3 for Python execution');
		this.pythonCommand = ['python3'];
		return this.pythonCommand;
	}

	/**
	 * Get bundled uv path, downloading if necessary
	 */
	private async getBundledUvPath(): Promise<string | null> {
		try {
			// Ensure global storage is available
			const globalStoragePath = this.context.globalStorageUri.fsPath;
			if (!globalStoragePath) {
				this.logger.debug('Global storage not available');
				return null;
			}

			const uvDir = path.join(globalStoragePath, 'uv');
			const platformInfo = this.getUvDownloadInfo();

			if (!platformInfo) {
				this.logger.debug('uv not available for this platform');
				return null;
			}

			const uvPath = path.join(uvDir, platformInfo.executable);

			// Check if already downloaded and executable
			if (await this.isExecutableAvailable(uvPath)) {
				this.logger.debug(`Using cached uv: ${uvPath}`);
				return uvPath;
			}

			// If download is already in progress, wait for it
			if (this.uvDownloadInProgress && this.uvDownloadPromise) {
				this.logger.debug('uv download in progress, waiting for completion...');
				return await this.uvDownloadPromise;
			}

			// Start download
			return await this.initiateUvDownload(uvDir, uvPath, platformInfo);

		} catch (error) {
			this.logger.error(`Error getting bundled uv: ${error instanceof Error ? error.message : String(error)}`);
			return null;
		}
	}

	/**
	 * Check if executable file exists and is executable
	 */
	private async isExecutableAvailable(execPath: string): Promise<boolean> {
		try {
			await fs.promises.access(execPath, fs.constants.F_OK | fs.constants.X_OK);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Initiate uv download with proper locking
	 */
	private async initiateUvDownload(
		uvDir: string,
		uvPath: string,
		platformInfo: UvDownloadInfo
	): Promise<string | null> {
		// Set flag and create download promise
		this.uvDownloadInProgress = true;

		this.uvDownloadPromise = (async () => {
			try {
				// Double-check after acquiring lock
				if (await this.isExecutableAvailable(uvPath)) {
					this.logger.debug(`Using cached uv (double-check): ${uvPath}`);
					return uvPath;
				}

				// Show progress notification
				return await vscode.window.withProgress(
					{
						location: vscode.ProgressLocation.Notification,
						title: 'Downloading uv Python package manager...',
						cancellable: false,
					},
					async (progress) => {
						progress.report({ message: 'Preparing download...' });

						await this.downloadUv(uvDir, platformInfo, progress);

						// Verify downloaded file
						if (await this.isExecutableAvailable(uvPath)) {
							await fs.promises.chmod(uvPath, 0o755); // Ensure executable
							this.logger.info(`Successfully downloaded uv to: ${uvPath}`);
							progress.report({ message: 'Complete!', increment: 100 });
							return uvPath;
						} else {
							this.logger.error('uv download completed but file not found or not executable');
							return null;
						}
					}
				);
			} catch (error) {
				this.logger.error(`Failed to download uv: ${error instanceof Error ? error.message : String(error)}`);
				return null;
			} finally {
				this.uvDownloadInProgress = false;
				this.uvDownloadPromise = null;
			}
		})();

		return await this.uvDownloadPromise;
	}

	/**
	 * Get platform-specific uv download information
	 */
	private getUvDownloadInfo(): UvDownloadInfo | null {
		const platform = process.platform;
		const arch = process.arch;

		// Use configured version
		const version = PythonExecutor.UV_VERSION;
		const baseUrl = `https://github.com/astral-sh/uv/releases/download/${version}`;

		switch (platform) {
			case 'darwin':
				if (arch === 'x64') {
					return {
						url: `${baseUrl}/uv-x86_64-apple-darwin.tar.gz`,
						filename: 'uv-x86_64-apple-darwin.tar.gz',
						executable: 'uv'
					};
				} else if (arch === 'arm64') {
					return {
						url: `${baseUrl}/uv-aarch64-apple-darwin.tar.gz`,
						filename: 'uv-aarch64-apple-darwin.tar.gz',
						executable: 'uv'
					};
				}
				break;
			case 'linux':
				if (arch === 'x64') {
					return {
						url: `${baseUrl}/uv-x86_64-unknown-linux-gnu.tar.gz`,
						filename: 'uv-x86_64-unknown-linux-gnu.tar.gz',
						executable: 'uv'
					};
				} else if (arch === 'arm64') {
					return {
						url: `${baseUrl}/uv-aarch64-unknown-linux-gnu.tar.gz`,
						filename: 'uv-aarch64-unknown-linux-gnu.tar.gz',
						executable: 'uv'
					};
				}
				break;
			case 'win32':
				if (arch === 'x64') {
					return {
						url: `${baseUrl}/uv-x86_64-pc-windows-msvc.zip`,
						filename: 'uv-x86_64-pc-windows-msvc.zip',
						executable: 'uv.exe'
					};
				}
				break;
		}

		return null;
	}

	/**
	 * Download and extract uv binary
	 */
	private async downloadUv(
		uvDir: string,
		downloadInfo: UvDownloadInfo,
		progress?: vscode.Progress<{ message?: string; increment?: number }>
	): Promise<void> {
		this.logger.info(`Downloading uv for ${process.platform}-${process.arch}...`);
		progress?.report({ message: `Downloading ${downloadInfo.filename}...`, increment: 10 });

		// Ensure directory exists
		await fs.promises.mkdir(uvDir, { recursive: true });

		const archivePath = path.join(uvDir, downloadInfo.filename);

		// Download the archive
		progress?.report({ message: 'Downloading binary...', increment: 20 });
		await this.downloadFile(downloadInfo.url, archivePath);

		// Extract the archive
		progress?.report({ message: 'Extracting archive...', increment: 50 });
		if (downloadInfo.filename.endsWith('.tar.gz')) {
			await this.extractTarGz(archivePath, uvDir);
		} else if (downloadInfo.filename.endsWith('.zip')) {
			await this.extractZip(archivePath, uvDir);
		}

		// Find and move the uv executable to the expected location
		progress?.report({ message: 'Configuring executable...', increment: 70 });
		await this.findAndMoveExecutable(uvDir, downloadInfo.executable);

		// Clean up archive
		progress?.report({ message: 'Cleaning up...', increment: 90 });
		try {
			await fs.promises.unlink(archivePath);
		} catch {
			// Ignore cleanup errors
		}
	}

	/**
	 * Download file from URL with redirect handling
	 */
	private async downloadFile(url: string, filePath: string, redirectCount = 0): Promise<void> {
		if (redirectCount > PythonExecutor.MAX_DOWNLOAD_RETRIES) {
			throw new Error('Too many redirects');
		}

		return new Promise((resolve, reject) => {
			const file = fs.createWriteStream(filePath);

			// Add timeout for download
			const timeout = setTimeout(() => {
				file.destroy();
				fs.promises.unlink(filePath).catch(() => { });
				reject(new Error('Download timeout'));
			}, PythonExecutor.DOWNLOAD_TIMEOUT_MS);

			https.get(url, (response) => {
				clearTimeout(timeout);

				if (response.statusCode === 302 || response.statusCode === 301) {
					// Handle redirects recursively
					file.destroy();
					const location = response.headers.location;
					if (location) {
						// Convert relative URLs to absolute
						const redirectUrl = location.startsWith('http') ? location : new URL(location, url).toString();
						this.downloadFile(redirectUrl, filePath, redirectCount + 1)
							.then(resolve)
							.catch(reject);
					} else {
						reject(new Error('Redirect without location header'));
					}
				} else if (response.statusCode === 200) {
					response.pipe(file);
					file.on('finish', () => {
						file.close();
						resolve();
					});
					response.on('error', reject);
				} else {
					file.destroy();
					reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
				}
			}).on('error', (err) => {
				clearTimeout(timeout);
				file.destroy();
				fs.promises.unlink(filePath).catch(() => { });
				reject(err);
			});

			file.on('error', (err) => {
				clearTimeout(timeout);
				fs.promises.unlink(filePath).catch(() => { }); // Clean up on error
				reject(err);
			});
		});
	}

	/**
	 * Extract tar.gz archive
	 */
	private async extractTarGz(archivePath: string, extractDir: string): Promise<void> {
		return new Promise((resolve, reject) => {
			const tar = spawn('tar', ['-xzf', archivePath, '-C', extractDir]);

			tar.on('close', (code) => {
				if (code === 0) {
					resolve();
				} else {
					reject(new Error(`tar extraction failed with code ${code}`));
				}
			});

			tar.on('error', reject);
		});
	}

	/**
	 * Extract zip archive (Windows)
	 */
	private async extractZip(archivePath: string, extractDir: string): Promise<void> {
		return new Promise((resolve, reject) => {
			// On Windows, prefer PowerShell since unzip might not be available
			if (process.platform === 'win32') {
				const powershell = spawn('powershell', [
					'-Command',
					`Expand-Archive -Path "${archivePath}" -DestinationPath "${extractDir}" -Force`
				]);

				powershell.on('close', (code) => {
					if (code === 0) {
						resolve();
					} else {
						reject(new Error(`PowerShell extraction failed with code ${code}`));
					}
				});

				powershell.on('error', reject);
			} else {
				// Fallback to unzip on other platforms
				const unzip = spawn('unzip', ['-q', archivePath, '-d', extractDir]);

				unzip.on('close', (code) => {
					if (code === 0) {
						resolve();
					} else {
						reject(new Error(`unzip extraction failed with code ${code}`));
					}
				});

				unzip.on('error', reject);
			}
		});
	}

	/**
	 * Find and move executable to expected location after extraction
	 */
	private async findAndMoveExecutable(uvDir: string, executableName: string): Promise<void> {
		const expectedPath = path.join(uvDir, executableName);

		// Check if already in the right place
		if (fs.existsSync(expectedPath)) {
			return;
		}

		// Search for the executable in subdirectories
		const findExecutable = async (dir: string): Promise<string | null> => {
			try {
				const entries = await fs.promises.readdir(dir, { withFileTypes: true });

				for (const entry of entries) {
					const fullPath = path.join(dir, entry.name);

					if (entry.isFile() && entry.name === executableName) {
						return fullPath;
					} else if (entry.isDirectory()) {
						const found = await findExecutable(fullPath);
						if (found) {
							return found;
						}
					}
				}
			} catch (error) {
				// Ignore permission errors
			}

			return null;
		};

		const foundPath = await findExecutable(uvDir);
		if (foundPath && foundPath !== expectedPath) {
			// Move executable to expected location
			await fs.promises.rename(foundPath, expectedPath);
			this.logger.debug(`Moved executable from ${foundPath} to ${expectedPath}`);
		}
	}

	/**
	 * Get Python path from VS Code Python extension
	 */
	private async getPythonFromExtension(): Promise<string | null> {
		try {
			const pythonExtension = vscode.extensions.getExtension('ms-python.python');
			if (!pythonExtension) {
				this.logger.debug('Python extension not found');
				return null;
			}

			if (!pythonExtension.isActive) {
				await pythonExtension.activate();
			}

			const pythonApi = pythonExtension.exports;
			if (pythonApi && pythonApi.settings && pythonApi.settings.getExecutionDetails) {
				const executionDetails = pythonApi.settings.getExecutionDetails();
				if (executionDetails && executionDetails.execCommand) {
					const pythonPath = Array.isArray(executionDetails.execCommand)
						? executionDetails.execCommand[0]
						: executionDetails.execCommand;

					this.logger.debug(`Found Python via extension: ${pythonPath}`);
					return pythonPath;
				}
			}

			return null;
		} catch (error) {
			this.logger.debug(`Failed to get Python from extension: ${error instanceof Error ? error.message : String(error)}`);
			return null;
		}
	}

	/**
	 * Check if a command is available in PATH
	 */
	private async isCommandAvailable(command: string): Promise<boolean> {
		return new Promise((resolve) => {
			const childProcess = spawn(command, ['--version'], {
				stdio: 'ignore',
			});

			childProcess.on('error', () => resolve(false));
			childProcess.on('close', (code) => resolve(code === 0));
		});
	}

	/**
	 * Execute a Python script with arguments.
	 *
	 * @param scriptPath Path to the Python script
	 * @param args Arguments to pass to the script
	 * @returns Execution result with stdout, stderr, and exit code
	 *
	 * TODO (Post-MVP): Consider connection pooling or process reuse
	 * Current implementation spawns a new process for every call.
	 * For workspaces with many files, this creates significant overhead.
	 *
	 * Alternative approaches:
	 * - Keep a long-lived Python REPL and send commands via stdin
	 * - Implement request queuing to batch multiple parse requests
	 * - Use worker threads pool with persistent Python interpreters
	 */
	async execute(scriptPath: string, args: string[] = []): Promise<PythonExecutionResult> {
		const pythonCmd = await this.detectPythonCommand();
		const timeout = this.config.timeout || 10000; // 10 seconds default

		return new Promise((resolve) => {
			const fullCommand = [...pythonCmd, scriptPath, ...args];
			this.logger.debug(`Executing: ${fullCommand.join(' ')}`);

			const childProcess: ChildProcess = spawn(fullCommand[0], fullCommand.slice(1), {
				cwd: this.config.cwd,
				env: { ...process.env },
			});

			let stdout = '';
			let stderr = '';
			let timedOut = false;

			// Timeout handler
			const timer = setTimeout(() => {
				timedOut = true;
				childProcess.kill('SIGTERM');
				this.logger.error(`Python execution timed out after ${timeout}ms`);
			}, timeout);

			// Collect stdout
			childProcess.stdout?.on('data', (data: Buffer) => {
				stdout += data.toString();
			});

			// Collect stderr
			childProcess.stderr?.on('data', (data: Buffer) => {
				stderr += data.toString();
			});

			// Handle process completion
			childProcess.on('close', (code: number | null) => {
				clearTimeout(timer);

				if (timedOut) {
					resolve({
						success: false,
						stdout,
						stderr: stderr + '\nProcess timed out',
						exitCode: null,
					});
					return;
				}

				const success = code === 0;
				if (!success) {
					this.logger.error(`Python execution failed with code ${code}`);
					this.logger.error(`stderr: ${stderr}`);
				}

				resolve({
					success,
					stdout,
					stderr,
					exitCode: code,
				});
			});

			// Handle spawn errors
			childProcess.on('error', (error) => {
				clearTimeout(timer);
				this.logger.error(`Failed to spawn Python process: ${error.message}`);
				resolve({
					success: false,
					stdout,
					stderr: error.message,
					exitCode: null,
				});
			});
		});
	}

	/**
	 * Execute Python script and parse JSON output.
	 *
	 * @param scriptPath Path to the Python script
	 * @param args Arguments to pass to the script
	 * @returns Parsed JSON object or null if parsing fails
	 */
	async executeJson<T = any>(scriptPath: string, args: string[] = []): Promise<T | null> {
		const result = await this.execute(scriptPath, args);

		if (!result.success) {
			this.logger.error('Python script execution failed');
			return null;
		}

		try {
			return JSON.parse(result.stdout) as T;
		} catch (error) {
			this.logger.error(`Failed to parse JSON output: ${error instanceof Error ? error.message : String(error)}`);
			this.logger.debug(`stdout: ${result.stdout}`);
			return null;
		}
	}

	/**
	 * Reset cached Python command (useful for testing or config changes)
	 */
	resetCommand(): void {
		this.pythonCommand = null;
	}
}
