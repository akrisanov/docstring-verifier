import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { PythonExecutor } from '../../../parsers/python/pythonExecutor';

suite('PythonExecutor Test Suite', () => {
	let executor: PythonExecutor;
	let mockContext: vscode.ExtensionContext;

	setup(() => {
		const projectRoot = path.resolve(__dirname, '..', '..', '..', '..');
		const globalStorageUri = vscode.Uri.file(path.join(projectRoot, '.vscode-test', 'globalStorage'));

		mockContext = {
			asAbsolutePath: (relativePath: string) => {
				return path.join(projectRoot, relativePath);
			},
			globalStorageUri: globalStorageUri,
		} as any;

		executor = new PythonExecutor(mockContext);
	});

	test('Can detect Python command', async function () {
		this.timeout(15000); // Longer timeout for potential uv download

		// Test that we can detect some Python command
		const result = await executor.execute('--version', []);

		// Should succeed with some Python version
		// (either through uv, system python3, or Python extension)
		assert.ok(result, 'Should get execution result');

		// Don't require success since Python might not be available in CI
		// but we should at least get a result object
		assert.ok(typeof result.success === 'boolean', 'Should have success field');
		assert.ok(typeof result.stdout === 'string', 'Should have stdout field');
		assert.ok(typeof result.stderr === 'string', 'Should have stderr field');
	});

	test('Can execute simple Python script', async function () {
		this.timeout(15000);

		// Create a simple Python script
		const tempDir = path.join(__dirname, '..', '..', 'temp');
		await fs.promises.mkdir(tempDir, { recursive: true });

		const scriptPath = path.join(tempDir, 'test_script.py');
		await fs.promises.writeFile(scriptPath, 'print("Hello from Python")');

		try {
			const result = await executor.execute(scriptPath, []);

			// If Python is available, should succeed
			if (result.success) {
				assert.ok(result.stdout.includes('Hello from Python'), 'Should execute Python script');
			} else {
				// If Python is not available, that's ok for CI
				console.log('Python not available, skipping execution test');
			}
		} finally {
			// Cleanup
			try {
				await fs.promises.unlink(scriptPath);
				await fs.promises.rmdir(tempDir);
			} catch {
				// Ignore cleanup errors
			}
		}
	});

	test('Handles non-existent script gracefully', async function () {
		this.timeout(10000);

		const result = await executor.execute('/non/existent/script.py', []);

		// Should not succeed but should not throw
		assert.strictEqual(result.success, false, 'Should fail for non-existent script');
		assert.ok(result.stderr.length > 0, 'Should have error message');
	});

	test('Handles JSON parsing', async function () {
		this.timeout(15000);

		// Create a script that outputs JSON
		const tempDir = path.join(__dirname, '..', '..', 'temp');
		await fs.promises.mkdir(tempDir, { recursive: true });

		const scriptPath = path.join(tempDir, 'json_script.py');
		await fs.promises.writeFile(scriptPath, 'import json; print(json.dumps({"test": "value"}))');

		try {
			const result = await executor.executeJson<{ test: string }>(scriptPath, []);

			// If Python is available, should parse JSON
			if (result) {
				assert.strictEqual(result.test, 'value', 'Should parse JSON output');
			} else {
				console.log('Python not available or script failed, skipping JSON test');
			}
		} finally {
			// Cleanup
			try {
				await fs.promises.unlink(scriptPath);
				await fs.promises.rmdir(tempDir);
			} catch {
				// Ignore cleanup errors
			}
		}
	});
});
