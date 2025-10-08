import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { PythonExecutor } from '../../../parsers/python/pythonExecutor';

suite('PythonExecutor Test Suite', () => {
	let executor: PythonExecutor;
	let mockContext: vscode.ExtensionContext;
	let tempDir: string;

	setup(async () => {
		const projectRoot = path.resolve(__dirname, '..', '..', '..', '..');
		const globalStorageUri = vscode.Uri.file(path.join(projectRoot, '.vscode-test', 'globalStorage'));

		mockContext = {
			asAbsolutePath: (relativePath: string) => {
				return path.join(projectRoot, relativePath);
			},
			globalStorageUri: globalStorageUri,
		} as any;

		executor = new PythonExecutor(mockContext);

		// Create temp directory for all tests
		tempDir = path.join(__dirname, '..', '..', 'temp');
		await fs.promises.mkdir(tempDir, { recursive: true });
	});

	teardown(async () => {
		// Clean up temp directory
		try {
			const files = await fs.promises.readdir(tempDir);
			for (const file of files) {
				await fs.promises.unlink(path.join(tempDir, file));
			}
			await fs.promises.rmdir(tempDir);
		} catch {
			// Ignore cleanup errors
		}
	});

	test('Should detect Python command', async function () {
		this.timeout(15000); // Longer timeout for potential uv download

		const result = await executor.execute('--version', []);

		// Should get execution result structure
		assert.ok(result, 'Should get execution result');
		assert.ok(typeof result.success === 'boolean', 'Should have success field');
		assert.ok(typeof result.stdout === 'string', 'Should have stdout field');
		assert.ok(typeof result.stderr === 'string', 'Should have stderr field');
	});

	test('Should execute Python script and parse JSON output', async function () {
		this.timeout(15000);

		// Create script that outputs JSON
		const scriptPath = path.join(tempDir, 'test_json.py');
		await fs.promises.writeFile(
			scriptPath,
			'import json; print(json.dumps({"test": "value", "number": 42}))'
		);

		const result = await executor.executeJson<{ test: string; number: number }>(scriptPath, []);

		// If Python available, should parse JSON correctly
		if (result) {
			assert.strictEqual(result.test, 'value', 'Should parse string field');
			assert.strictEqual(result.number, 42, 'Should parse number field');
		}
	});

	test('Should fail gracefully for non-existent script', async function () {
		this.timeout(5000);

		const result = await executor.execute('/non/existent/script.py', []);

		assert.strictEqual(result.success, false, 'Should fail for non-existent script');
		assert.ok(result.stderr.length > 0, 'Should have error message');
	});
});
