import * as assert from 'assert';
import * as vscode from 'vscode';
import { PythonReturnAnalyzer } from '../../../analyzers/python/returnAnalyzer';
import { FunctionDescriptor } from '../../../parsers/types';
import { DocstringDescriptor, DocstringReturnDescriptor } from '../../../docstring/types';
import { DiagnosticCode } from '../../../diagnostics/types';

suite('PythonReturnAnalyzer - Return Type Mismatch Tests', () => {
	let analyzer: PythonReturnAnalyzer;
	const testRange = new vscode.Range(0, 0, 10, 0);

	/**
	 * Helper to create a minimal FunctionDescriptor for testing
	 */
	function createFunc(returnType: string | null): FunctionDescriptor {
		return {
			name: 'test_func',
			range: testRange,
			parameters: [],
			returnType,
			returnStatements: [],
			raises: [],
			docstring: 'Test',
			docstringRange: testRange,
			hasIO: false,
			hasGlobalMods: false
		};
	}

	/**
	 * Helper to create a minimal DocstringDescriptor for testing
	 */
	function createDocstring(returns: DocstringReturnDescriptor | null): DocstringDescriptor {
		return {
			parameters: [],
			returns,
			raises: [],
			notes: null
		};
	}

	setup(() => {
		analyzer = new PythonReturnAnalyzer();
	});

	test('DSV201: Should detect real return type mismatch', () => {
		const func = createFunc('dict');
		const docstring = createDocstring({
			type: 'list',
			description: 'User information'
		});

		const diagnostics = analyzer.analyze(func, docstring);
		const typeMismatch = diagnostics.find(d => d.code === DiagnosticCode.RETURN_TYPE_MISMATCH);

		assert.ok(typeMismatch, 'Should detect return type mismatch');
		assert.ok(typeMismatch!.message.includes('dict'));
		assert.ok(typeMismatch!.message.includes('list'));
		assert.strictEqual(typeMismatch!.severity, vscode.DiagnosticSeverity.Warning);
	});

	test('DSV201: Should not report when types match', () => {
		const func = createFunc('dict');
		const docstring = createDocstring({
			type: 'dict',
			description: 'User information'
		});

		const diagnostics = analyzer.analyze(func, docstring);
		const typeMismatch = diagnostics.find(d => d.code === DiagnosticCode.RETURN_TYPE_MISMATCH);

		assert.strictEqual(typeMismatch, undefined, 'Should not report when types match');
	});

	test('DSV201: Should normalize common type aliases', () => {
		const testCases = [
			{ code: 'str', doc: 'string' },
			{ code: 'int', doc: 'integer' },
			{ code: 'bool', doc: 'boolean' },
			{ code: 'dict', doc: 'dictionary' }
		];

		for (const { code, doc } of testCases) {
			const func = createFunc(code);
			const docstring = createDocstring({
				type: doc,
				description: 'Result'
			});

			const diagnostics = analyzer.analyze(func, docstring);
			const typeMismatch = diagnostics.find(d => d.code === DiagnosticCode.RETURN_TYPE_MISMATCH);

			assert.strictEqual(
				typeMismatch,
				undefined,
				`Should normalize "${doc}" to "${code}"`
			);
		}
	});

	test('DSV201: Should normalize Optional syntax', () => {
		const func = createFunc('int | None');
		const docstring = createDocstring({
			type: 'Optional[int]',
			description: 'Value'
		});

		const diagnostics = analyzer.analyze(func, docstring);
		const typeMismatch = diagnostics.find(d => d.code === DiagnosticCode.RETURN_TYPE_MISMATCH);

		assert.strictEqual(typeMismatch, undefined, 'Should normalize Optional[int] to int|none');
	});

	test('DSV201: Should be case-insensitive', () => {
		const func = createFunc('str');
		const docstring = createDocstring({
			type: 'STR',
			description: 'Result'
		});

		const diagnostics = analyzer.analyze(func, docstring);
		const typeMismatch = diagnostics.find(d => d.code === DiagnosticCode.RETURN_TYPE_MISMATCH);

		assert.strictEqual(typeMismatch, undefined, 'Should be case-insensitive');
	});

	test('DSV201: Should skip when code has no return type', () => {
		const func = createFunc(null);
		const docstring = createDocstring({
			type: 'dict',
			description: 'Result'
		});

		const diagnostics = analyzer.analyze(func, docstring);
		const typeMismatch = diagnostics.filter(d => d.code === DiagnosticCode.RETURN_TYPE_MISMATCH);

		assert.strictEqual(typeMismatch.length, 0, 'Should not check when code has no return type');
	});

	test('DSV201: Should skip when docstring has no return type', () => {
		const func = createFunc('dict');
		const docstring = createDocstring({
			type: null,
			description: 'Result'
		});

		const diagnostics = analyzer.analyze(func, docstring);
		const typeMismatch = diagnostics.filter(d => d.code === DiagnosticCode.RETURN_TYPE_MISMATCH);

		assert.strictEqual(typeMismatch.length, 0, 'Should not check when docstring has no return type');
	});

	test('DSV201: Should skip when docstring has no returns section', () => {
		const func = createFunc('dict');
		const docstring = createDocstring(null);

		const diagnostics = analyzer.analyze(func, docstring);
		const typeMismatch = diagnostics.filter(d => d.code === DiagnosticCode.RETURN_TYPE_MISMATCH);

		assert.strictEqual(typeMismatch.length, 0, 'Should not check when docstring has no returns section');
	});

	test('DSV201: Should handle complex types', () => {
		const func = createFunc('list[int]');
		const docstring = createDocstring({
			type: 'list[int]',
			description: 'List of numbers'
		});

		const diagnostics = analyzer.analyze(func, docstring);
		const typeMismatch = diagnostics.find(d => d.code === DiagnosticCode.RETURN_TYPE_MISMATCH);

		assert.strictEqual(typeMismatch, undefined, 'Should handle complex types');
	});

	test('DSV201: Should detect mismatch in complex types', () => {
		const func = createFunc('list[int]');
		const docstring = createDocstring({
			type: 'list[str]',
			description: 'List of strings'
		});

		const diagnostics = analyzer.analyze(func, docstring);
		const typeMismatch = diagnostics.find(d => d.code === DiagnosticCode.RETURN_TYPE_MISMATCH);

		assert.ok(typeMismatch, 'Should detect mismatch in complex types');
		assert.ok(typeMismatch!.message.includes('list[int]'));
		assert.ok(typeMismatch!.message.includes('list[str]'));
	});

	test('DSV201: Should handle dict type variations', () => {
		const func = createFunc('dict[str, int]');
		const docstring = createDocstring({
			type: 'dict[str, int]',
			description: 'Mapping'
		});

		const diagnostics = analyzer.analyze(func, docstring);
		const typeMismatch = diagnostics.find(d => d.code === DiagnosticCode.RETURN_TYPE_MISMATCH);

		assert.strictEqual(typeMismatch, undefined, 'Should handle dict type variations');
	});

	test('DSV201: Should normalize float type', () => {
		const func = createFunc('float');
		const docstring = createDocstring({
			type: 'float',
			description: 'Average'
		});

		const diagnostics = analyzer.analyze(func, docstring);
		const typeMismatch = diagnostics.find(d => d.code === DiagnosticCode.RETURN_TYPE_MISMATCH);

		assert.strictEqual(typeMismatch, undefined, 'Should handle float type');
	});

	test('DSV201: Should detect mismatch between float and int', () => {
		const func = createFunc('float');
		const docstring = createDocstring({
			type: 'int',
			description: 'Result'
		});

		const diagnostics = analyzer.analyze(func, docstring);
		const typeMismatch = diagnostics.find(d => d.code === DiagnosticCode.RETURN_TYPE_MISMATCH);

		assert.ok(typeMismatch, 'Should detect mismatch between float and int');
	});

	test('DSV201: Should handle aliases in return types', () => {
		// Code uses 'str', docstring uses 'string' - should match
		const func = createFunc('str');
		const docstring = createDocstring({
			type: 'string',
			description: 'Result'
		});

		const diagnostics = analyzer.analyze(func, docstring);
		const typeMismatch = diagnostics.find(d => d.code === DiagnosticCode.RETURN_TYPE_MISMATCH);

		assert.strictEqual(typeMismatch, undefined, 'Should normalize string to str');
	});

	test('DSV201: Should handle Optional return types', () => {
		// Code: str | None, Doc: Optional[str] - should match
		const func = createFunc('str | None');
		const docstring = createDocstring({
			type: 'Optional[str]',
			description: 'Result or None'
		});

		const diagnostics = analyzer.analyze(func, docstring);
		const typeMismatch = diagnostics.find(d => d.code === DiagnosticCode.RETURN_TYPE_MISMATCH);

		assert.strictEqual(typeMismatch, undefined, 'Should normalize Optional[str] to str|none');
	});

	test('DSV201: Should detect real-world list vs dict mismatch', () => {
		// This is from the example file: returns list but documents dict
		const func = createFunc('list');
		const docstring = createDocstring({
			type: 'dict',
			description: 'User information'
		});

		const diagnostics = analyzer.analyze(func, docstring);
		const typeMismatch = diagnostics.find(d => d.code === DiagnosticCode.RETURN_TYPE_MISMATCH);

		assert.ok(typeMismatch, 'Should detect list vs dict mismatch');
		assert.ok(typeMismatch!.message.includes('get_user_data') || typeMismatch!.message.includes('test_func'));
		assert.strictEqual(typeMismatch!.severity, vscode.DiagnosticSeverity.Warning);
	});
});
