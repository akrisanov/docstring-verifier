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
		// This test requires Python to be available, so we set a longer timeout
		this.timeout(10000);

		// Load the fixture file from Python tests (reusing existing test file)
		const fixturePath = mockContext.asAbsolutePath(
			path.join('tools', 'python', 'tests', 'fixtures', 'test_sample.py')
		);

		const uri = vscode.Uri.file(fixturePath);
		const document = await vscode.workspace.openTextDocument(uri);

		// Parse the document
		const functions = await parser.parse(document);

		// Verify we found 3 functions
		assert.strictEqual(functions.length, 3, 'Should find 3 functions');

		// Check first function: calculate
		const calculateFunc = functions.find(f => f.name === 'calculate');
		assert.ok(calculateFunc, 'Should find "calculate" function');
		assert.strictEqual(calculateFunc.parameters.length, 2, 'calculate should have 2 parameters');
		assert.strictEqual(calculateFunc.parameters[0].name, 'x');
		assert.strictEqual(calculateFunc.parameters[0].type, 'int');
		assert.strictEqual(calculateFunc.parameters[0].isOptional, false);
		assert.strictEqual(calculateFunc.parameters[1].name, 'y');
		assert.strictEqual(calculateFunc.parameters[1].type, 'int');
		assert.strictEqual(calculateFunc.returnType, 'int');
		assert.ok(calculateFunc.docstring, 'calculate should have a docstring');
		assert.ok(calculateFunc.docstring!.includes('Calculate result'));

		// Check second function: fetch_data
		const fetchFunc = functions.find(f => f.name === 'fetch_data');
		assert.ok(fetchFunc, 'Should find "fetch_data" function');
		assert.strictEqual(fetchFunc.parameters.length, 2, 'fetch_data should have 2 parameters');
		assert.strictEqual(fetchFunc.parameters[0].name, 'url');
		assert.strictEqual(fetchFunc.parameters[0].type, 'str');
		assert.strictEqual(fetchFunc.parameters[0].isOptional, false);
		assert.strictEqual(fetchFunc.parameters[1].name, 'timeout');
		assert.strictEqual(fetchFunc.parameters[1].type, 'int');
		assert.strictEqual(fetchFunc.parameters[1].defaultValue, '30');
		assert.strictEqual(fetchFunc.parameters[1].isOptional, true, 'timeout should be optional');
		assert.strictEqual(fetchFunc.returnType, 'dict');
		// Check that exceptions were parsed (only ValueError is actually raised in code)
		assert.strictEqual(fetchFunc.raises.length, 1, 'fetch_data should raise 1 exception');
		assert.strictEqual(fetchFunc.raises[0].type, 'ValueError', 'Should raise ValueError');
		// Check that I/O was detected
		assert.strictEqual(fetchFunc.hasIO, true, 'fetch_data should have I/O');

		// Check third function: process_items (with *args and **kwargs)
		const processFunc = functions.find(f => f.name === 'process_items');
		assert.ok(processFunc, 'Should find "process_items" function');
		assert.strictEqual(processFunc.parameters.length, 2, 'process_items should have 2 parameters');
		// Note: AST extractor includes * and ** in parameter names
		assert.strictEqual(processFunc.parameters[0].name, '*args');
		assert.strictEqual(processFunc.parameters[0].isOptional, true, '*args should be optional');
		assert.strictEqual(processFunc.parameters[1].name, '**kwargs');
		assert.strictEqual(processFunc.parameters[1].isOptional, true, '**kwargs should be optional');
		// Check that global modifications were detected
		assert.strictEqual(processFunc.hasGlobalMods, true, 'process_items should have global modifications');
	});

	test('Parse empty Python file', async function () {
		this.timeout(10000);

		// Create a temporary empty document
		const content = '# Empty file\n';
		const document = await vscode.workspace.openTextDocument({
			language: 'python',
			content: content,
		});

		const functions = await parser.parse(document);
		assert.strictEqual(functions.length, 0, 'Should find no functions in empty file');
	});

	test('Handle Python file with syntax errors', async function () {
		this.timeout(10000);

		// Create a document with syntax errors
		const content = 'def broken_function(\n    # Missing closing parenthesis\n';
		const document = await vscode.workspace.openTextDocument({
			language: 'python',
			content: content,
		});

		const functions = await parser.parse(document);
		// Should return empty array on syntax errors
		assert.strictEqual(functions.length, 0, 'Should return empty array for syntax errors');
	});
});
