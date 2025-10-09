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
});

suite('PythonReturnAnalyzer - Missing Return in Docstring Tests', () => {
	let analyzer: PythonReturnAnalyzer;

	setup(() => {
		analyzer = new PythonReturnAnalyzer();
	});

	test('DSV202: Should detect missing return in docstring when function has return type', () => {
		const func = createTestFunction({ returnType: 'dict' });
		const docstring = createTestDocstring({
			parameters: []  // No returns section
		});

		const diagnostics = analyzer.analyze(func, docstring);
		const missingReturn = diagnostics.find(d => d.code === DiagnosticCode.RETURN_MISSING_IN_DOCSTRING);

		assert.ok(missingReturn, 'Should detect missing return in docstring');
		assert.ok(missingReturn!.message.includes('dict'));
		assert.ok(missingReturn!.message.includes('not documented'));
		assert.strictEqual(missingReturn!.severity, vscode.DiagnosticSeverity.Warning);
	});

	test('DSV202: Should not report when function returns None', () => {
		const func = createTestFunction({ returnType: 'None' });
		const docstring = createTestDocstring({
			parameters: []  // No returns section
		});

		const diagnostics = analyzer.analyze(func, docstring);
		const missingReturn = diagnostics.find(d => d.code === DiagnosticCode.RETURN_MISSING_IN_DOCSTRING);

		assert.strictEqual(missingReturn, undefined, 'Should not report for None return type');
	});

	test('DSV202: Should not report when function has no return type', () => {
		const func = createTestFunction({ returnType: null });
		const docstring = createTestDocstring({
			parameters: []  // No returns section
		});

		const diagnostics = analyzer.analyze(func, docstring);
		const missingReturn = diagnostics.find(d => d.code === DiagnosticCode.RETURN_MISSING_IN_DOCSTRING);

		assert.strictEqual(missingReturn, undefined, 'Should not report when no return type');
	});

	test('DSV202: Should not report when docstring has returns section', () => {
		const func = createTestFunction({ returnType: 'dict' });
		const docstring = createTestDocstring({
			returnType: 'dict',
			returnDescription: 'User data'
		});

		const diagnostics = analyzer.analyze(func, docstring);
		const missingReturn = diagnostics.find(d => d.code === DiagnosticCode.RETURN_MISSING_IN_DOCSTRING);

		assert.strictEqual(missingReturn, undefined, 'Should not report when returns section exists');
	});

	test('DSV202: Should be case-insensitive for None check', () => {
		const testCases = ['none', 'None', 'NONE', 'nOnE'];

		for (const noneVariant of testCases) {
			const func = createTestFunction({ returnType: noneVariant });
			const docstring = createTestDocstring({
				parameters: []
			});

			const diagnostics = analyzer.analyze(func, docstring);
			const missingReturn = diagnostics.find(d => d.code === DiagnosticCode.RETURN_MISSING_IN_DOCSTRING);

			assert.strictEqual(
				missingReturn,
				undefined,
				`Should not report for '${noneVariant}' return type`
			);
		}
	});

	test('DSV202: Should report for non-None return types', () => {
		const testCases = ['str', 'int', 'list', 'dict', 'bool', 'Optional[str]', 'list[int]'];

		for (const returnType of testCases) {
			const func = createTestFunction({ returnType });
			const docstring = createTestDocstring({
				parameters: []
			});

			const diagnostics = analyzer.analyze(func, docstring);
			const missingReturn = diagnostics.find(d => d.code === DiagnosticCode.RETURN_MISSING_IN_DOCSTRING);

			assert.ok(
				missingReturn,
				`Should report missing return for '${returnType}'`
			);
			assert.ok(missingReturn!.message.includes(returnType));
		}
	});

	test('DSV202: Should work together with DSV201 (both checks)', () => {
		// Function has return type but wrong in docstring
		const func = createTestFunction({ returnType: 'dict' });
		const docstring = createTestDocstring({
			returnType: 'list',  // Wrong type
			returnDescription: 'Data'
		});

		const diagnostics = analyzer.analyze(func, docstring);

		// Should have DSV201 (type mismatch) but NOT DSV202 (missing return)
		const typeMismatch = diagnostics.find(d => d.code === DiagnosticCode.RETURN_TYPE_MISMATCH);
		const missingReturn = diagnostics.find(d => d.code === DiagnosticCode.RETURN_MISSING_IN_DOCSTRING);

		assert.ok(typeMismatch, 'Should detect type mismatch');
		assert.strictEqual(missingReturn, undefined, 'Should not report missing when returns exists');
	});

	test('DSV202: Should not report when returns section exists but has no type', () => {
		const func = createTestFunction({ returnType: 'dict' });
		const docstring = createTestDocstring({
			returnType: null,  // No type specified
			returnDescription: 'Some data'
		});

		const diagnostics = analyzer.analyze(func, docstring);
		const missingReturn = diagnostics.find(d => d.code === DiagnosticCode.RETURN_MISSING_IN_DOCSTRING);

		assert.strictEqual(missingReturn, undefined, 'Should not report when returns section exists');
	});
});

suite('PythonReturnAnalyzer - Edge Cases and Interaction Tests', () => {
	let analyzer: PythonReturnAnalyzer;

	setup(() => {
		analyzer = new PythonReturnAnalyzer();
	});

	test('Edge Case: None return with wrong type in docstring should trigger DSV201, not DSV202', () => {
		const func = createTestFunction({ returnType: 'None' });
		const docstring = createTestDocstring({
			returnType: 'dict',
			returnDescription: 'Some data'
		});

		const diagnostics = analyzer.analyze(func, docstring);
		const typeMismatch = diagnostics.find(d => d.code === DiagnosticCode.RETURN_TYPE_MISMATCH);
		const missingReturn = diagnostics.find(d => d.code === DiagnosticCode.RETURN_MISSING_IN_DOCSTRING);

		assert.ok(typeMismatch, 'Should detect type mismatch for None vs dict');
		assert.strictEqual(missingReturn, undefined, 'Should not report missing return for None');
	});

	test('Edge Case: No return type but documented return should not trigger any diagnostic', () => {
		// This is for future DSV203 check
		const func = createTestFunction({ returnType: null });
		const docstring = createTestDocstring({
			returnType: 'dict',
			returnDescription: 'Some data'
		});

		const diagnostics = analyzer.analyze(func, docstring);

		// Neither DSV201 nor DSV202 should trigger
		assert.strictEqual(diagnostics.length, 0, 'Should not report anything (DSV203 not implemented yet)');
	});

	test('Edge Case: Optional[None] should be documented (not skipped like plain None)', () => {
		const func = createTestFunction({ returnType: 'Optional[None]' });
		const docstring = createTestDocstring({
			parameters: []  // No returns section
		});

		const diagnostics = analyzer.analyze(func, docstring);
		const missingReturn = diagnostics.find(d => d.code === DiagnosticCode.RETURN_MISSING_IN_DOCSTRING);

		assert.ok(missingReturn, 'Should report missing return for Optional[None]');
		assert.ok(missingReturn!.message.includes('Optional[None]'));
	});

	test('Edge Case: Union with None should be documented', () => {
		const func = createTestFunction({ returnType: 'str | None' });
		const docstring = createTestDocstring({
			parameters: []  // No returns section
		});

		const diagnostics = analyzer.analyze(func, docstring);
		const missingReturn = diagnostics.find(d => d.code === DiagnosticCode.RETURN_MISSING_IN_DOCSTRING);

		assert.ok(missingReturn, 'Should report missing return for str | None');
		assert.ok(missingReturn!.message.includes('str | None'));
	});
});

