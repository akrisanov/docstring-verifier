import * as assert from 'assert';
import * as vscode from 'vscode';
import { PythonReturnAnalyzer } from '../../../analyzers/python/returnAnalyzer';
import { DiagnosticCode } from '../../../diagnostics/types';
import {
	createTestFunction,
	createTestDocstring
} from './testUtils';

suite('PythonReturnAnalyzer - Return Type Mismatch Tests', () => {
	let analyzer: PythonReturnAnalyzer;

	setup(() => {
		analyzer = new PythonReturnAnalyzer();
	});

	test('DSV201: Should detect real return type mismatch', () => {
		const func = createTestFunction({ returnType: 'dict' });
		const docstring = createTestDocstring({
			returnType: 'list',
			returnDescription: 'User information'
		});

		const diagnostics = analyzer.analyze(func, docstring);
		const typeMismatch = diagnostics.find(d => d.code === DiagnosticCode.RETURN_TYPE_MISMATCH);

		assert.ok(typeMismatch, 'Should detect return type mismatch');
		assert.ok(typeMismatch!.message.includes('dict'));
		assert.ok(typeMismatch!.message.includes('list'));
		assert.strictEqual(typeMismatch!.severity, vscode.DiagnosticSeverity.Warning);
	});

	test('DSV201: Should not report when types match', () => {
		const func = createTestFunction({ returnType: 'dict' });
		const docstring = createTestDocstring({
			returnType: 'dict',
			returnDescription: 'User information'
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
			const func = createTestFunction({ returnType: code });
			const docstring = createTestDocstring({
				returnType: doc,
				returnDescription: 'Result'
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
		const func = createTestFunction({ returnType: 'int | None' });
		const docstring = createTestDocstring({
			returnType: 'Optional[int]',
			returnDescription: 'Value'
		});

		const diagnostics = analyzer.analyze(func, docstring);
		const typeMismatch = diagnostics.find(d => d.code === DiagnosticCode.RETURN_TYPE_MISMATCH);

		assert.strictEqual(typeMismatch, undefined, 'Should normalize Optional[int] to int|none');
	});

	test('DSV201: Should be case-insensitive', () => {
		const func = createTestFunction({ returnType: 'str' });
		const docstring = createTestDocstring({
			returnType: 'STR',
			returnDescription: 'Result'
		});

		const diagnostics = analyzer.analyze(func, docstring);
		const typeMismatch = diagnostics.find(d => d.code === DiagnosticCode.RETURN_TYPE_MISMATCH);

		assert.strictEqual(typeMismatch, undefined, 'Should be case-insensitive');
	});

	test('DSV201: Should skip when code has no return type', () => {
		const func = createTestFunction({ returnType: null });
		const docstring = createTestDocstring({
			returnType: 'dict',
			returnDescription: 'Result'
		});

		const diagnostics = analyzer.analyze(func, docstring);
		const typeMismatch = diagnostics.filter(d => d.code === DiagnosticCode.RETURN_TYPE_MISMATCH);

		assert.strictEqual(typeMismatch.length, 0, 'Should not check when code has no return type');
	});

	test('DSV201: Should skip when docstring has no return type', () => {
		const func = createTestFunction({ returnType: 'dict' });
		const docstring = createTestDocstring({
			returnType: null,
			returnDescription: 'Result'
		});

		const diagnostics = analyzer.analyze(func, docstring);
		const typeMismatch = diagnostics.filter(d => d.code === DiagnosticCode.RETURN_TYPE_MISMATCH);

		assert.strictEqual(typeMismatch.length, 0, 'Should not check when docstring has no return type');
	});

	test('DSV201: Should skip when docstring has no returns section', () => {
		const func = createTestFunction({ returnType: 'dict' });
		const docstring = createTestDocstring({});  // No returns section

		const diagnostics = analyzer.analyze(func, docstring);
		const typeMismatch = diagnostics.filter(d => d.code === DiagnosticCode.RETURN_TYPE_MISMATCH);

		assert.strictEqual(typeMismatch.length, 0, 'Should not check when docstring has no returns section');
	});

	test('DSV201: Should handle complex types', () => {
		const func = createTestFunction({ returnType: 'list[int]' });
		const docstring = createTestDocstring({
			returnType: 'list[int]',
			returnDescription: 'List of numbers'
		});

		const diagnostics = analyzer.analyze(func, docstring);
		const typeMismatch = diagnostics.find(d => d.code === DiagnosticCode.RETURN_TYPE_MISMATCH);

		assert.strictEqual(typeMismatch, undefined, 'Should handle complex types');
	});

	test('DSV201: Should detect mismatch in complex types', () => {
		const func = createTestFunction({ returnType: 'list[int]' });
		const docstring = createTestDocstring({
			returnType: 'list[str]',
			returnDescription: 'List of strings'
		});

		const diagnostics = analyzer.analyze(func, docstring);
		const typeMismatch = diagnostics.find(d => d.code === DiagnosticCode.RETURN_TYPE_MISMATCH);

		assert.ok(typeMismatch, 'Should detect mismatch in complex types');
		assert.ok(typeMismatch!.message.includes('list[int]'));
		assert.ok(typeMismatch!.message.includes('list[str]'));
	});

	test('DSV201: Should handle dict type variations', () => {
		const func = createTestFunction({ returnType: 'dict[str, int]' });
		const docstring = createTestDocstring({
			returnType: 'dict[str, int]',
			returnDescription: 'Mapping'
		});

		const diagnostics = analyzer.analyze(func, docstring);
		const typeMismatch = diagnostics.find(d => d.code === DiagnosticCode.RETURN_TYPE_MISMATCH);

		assert.strictEqual(typeMismatch, undefined, 'Should handle dict type variations');
	});

	test('DSV201: Should normalize float type', () => {
		const func = createTestFunction({ returnType: 'float' });
		const docstring = createTestDocstring({
			returnType: 'float',
			returnDescription: 'Average'
		});

		const diagnostics = analyzer.analyze(func, docstring);
		const typeMismatch = diagnostics.find(d => d.code === DiagnosticCode.RETURN_TYPE_MISMATCH);

		assert.strictEqual(typeMismatch, undefined, 'Should handle float type');
	});

	test('DSV201: Should detect mismatch between float and int', () => {
		const func = createTestFunction({ returnType: 'float' });
		const docstring = createTestDocstring({
			returnType: 'int',
			returnDescription: 'Result'
		});

		const diagnostics = analyzer.analyze(func, docstring);
		const typeMismatch = diagnostics.find(d => d.code === DiagnosticCode.RETURN_TYPE_MISMATCH);

		assert.ok(typeMismatch, 'Should detect mismatch between float and int');
	});

	test('DSV201: Should handle aliases in return types', () => {
		// Code uses 'str', docstring uses 'string' - should match
		const func = createTestFunction({ returnType: 'str' });
		const docstring = createTestDocstring({
			returnType: 'string',
			returnDescription: 'Result'
		});

		const diagnostics = analyzer.analyze(func, docstring);
		const typeMismatch = diagnostics.find(d => d.code === DiagnosticCode.RETURN_TYPE_MISMATCH);

		assert.strictEqual(typeMismatch, undefined, 'Should normalize string to str');
	});

	test('DSV201: Should handle Optional return types', () => {
		// Code: str | None, Doc: Optional[str] - should match
		const func = createTestFunction({ returnType: 'str | None' });
		const docstring = createTestDocstring({
			returnType: 'Optional[str]',
			returnDescription: 'Result or None'
		});

		const diagnostics = analyzer.analyze(func, docstring);
		const typeMismatch = diagnostics.find(d => d.code === DiagnosticCode.RETURN_TYPE_MISMATCH);

		assert.strictEqual(typeMismatch, undefined, 'Should normalize Optional[str] to str|none');
	});

	test('DSV201: Should detect real-world list vs dict mismatch', () => {
		// This is from the example file: returns list but documents dict
		const func = createTestFunction({ returnType: 'list' });
		const docstring = createTestDocstring({
			returnType: 'dict',
			returnDescription: 'User information'
		});

		const diagnostics = analyzer.analyze(func, docstring);
		const typeMismatch = diagnostics.find(d => d.code === DiagnosticCode.RETURN_TYPE_MISMATCH);

		assert.ok(typeMismatch, 'Should detect list vs dict mismatch');
		assert.ok(typeMismatch!.message.includes('get_user_data') || typeMismatch!.message.includes('test_func'));
		assert.strictEqual(typeMismatch!.severity, vscode.DiagnosticSeverity.Warning);
	});
});
