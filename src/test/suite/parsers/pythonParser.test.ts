import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { PythonParser } from '../../../parsers/python/pythonParser';

suite('PythonParser Test Suite', () => {
	let parser: PythonParser;
	let mockContext: vscode.ExtensionContext;

	// Create a minimal mock extension context
	setup(() => {
		const projectRoot = path.resolve(__dirname, '..', '..', '..', '..');
		const globalStorageUri = vscode.Uri.file(path.join(projectRoot, '.vscode-test', 'globalStorage'));

		mockContext = {
			asAbsolutePath: (relativePath: string) => {
				return path.join(projectRoot, relativePath);
			},
			globalStorageUri: globalStorageUri,
		} as any;

		parser = new PythonParser(mockContext);
	});

	test('Parse Python file with functions', async function () {
		this.timeout(10000);

		const fixturePath = mockContext.asAbsolutePath(
			path.join('tools', 'python', 'tests', 'fixtures', 'test_sample.py')
		);

		const uri = vscode.Uri.file(fixturePath);
		const document = await vscode.workspace.openTextDocument(uri);
		const functions = await parser.parse(document);

		assert.strictEqual(functions.length, 3, 'Should find 3 functions');

		// Verify first function: calculate (basic parameter parsing)
		const calculateFunc = functions.find(f => f.name === 'calculate');
		assert.ok(calculateFunc, 'Should find "calculate" function');
		assert.strictEqual(calculateFunc.parameters.length, 2);
		assert.deepStrictEqual(
			calculateFunc.parameters.map(p => ({ name: p.name, type: p.type, optional: p.isOptional })),
			[
				{ name: 'x', type: 'int', optional: false },
				{ name: 'y', type: 'int', optional: false }
			]
		);
		assert.strictEqual(calculateFunc.returnType, 'int');
		assert.ok(calculateFunc.docstring?.includes('Calculate result'));

		// Verify second function: fetch_data (optional params, exceptions, I/O detection)
		const fetchFunc = functions.find(f => f.name === 'fetch_data');
		assert.ok(fetchFunc, 'Should find "fetch_data" function');
		assert.strictEqual(fetchFunc.parameters[0].name, 'url');
		assert.strictEqual(fetchFunc.parameters[0].type, 'str');
		assert.strictEqual(fetchFunc.parameters[1].name, 'timeout');
		assert.strictEqual(fetchFunc.parameters[1].defaultValue, '30');
		assert.strictEqual(fetchFunc.parameters[1].isOptional, true, 'Parameter with default should be optional');
		assert.strictEqual(fetchFunc.returnType, 'dict');
		assert.strictEqual(fetchFunc.raises.length, 1, 'Should detect raised exception');
		assert.strictEqual(fetchFunc.raises[0].type, 'ValueError');
		assert.strictEqual(fetchFunc.hasIO, true, 'Should detect I/O operations');

		// Verify third function: process_items (varargs and global modifications)
		const processFunc = functions.find(f => f.name === 'process_items');
		assert.ok(processFunc, 'Should find "process_items" function');
		assert.strictEqual(processFunc.parameters.length, 2);
		assert.strictEqual(processFunc.parameters[0].name, '*args');
		assert.strictEqual(processFunc.parameters[1].name, '**kwargs');
		assert.strictEqual(processFunc.hasGlobalMods, true, 'Should detect global modifications');
	});

	test('Parse empty Python file', async function () {
		this.timeout(5000);

		const document = await vscode.workspace.openTextDocument({
			language: 'python',
			content: '# Empty file\n',
		});

		const functions = await parser.parse(document);
		assert.strictEqual(functions.length, 0, 'Should find no functions in empty file');
	});

	test('Handle Python file with syntax errors', async function () {
		this.timeout(5000);

		const document = await vscode.workspace.openTextDocument({
			language: 'python',
			content: 'def broken_function(\n    # Missing closing parenthesis\n',
		});

		const functions = await parser.parse(document);
		assert.strictEqual(functions.length, 0, 'Should return empty array for syntax errors');
	});
});
