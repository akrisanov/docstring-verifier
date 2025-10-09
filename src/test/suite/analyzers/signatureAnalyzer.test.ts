import * as assert from 'assert';
import * as vscode from 'vscode';
import { PythonSignatureAnalyzer } from '../../../analyzers/python/signatureAnalyzer';
import { DiagnosticCode } from '../../../diagnostics/types';
import {
	createTestFunction,
	createTestDocstring,
	createTestParameter,
	createTestDocstringParameter,
	TEST_URI
} from './testUtils';

suite('PythonSignatureAnalyzer - Type Mismatch Tests', () => {
	let analyzer: PythonSignatureAnalyzer;

	setup(() => {
		analyzer = new PythonSignatureAnalyzer();
	});

	test('DSV103: Should detect real type mismatch', () => {
		const func = createTestFunction({
			parameters: [createTestParameter('age', 'int')]
		});

		const docstring = createTestDocstring({
			parameters: [createTestDocstringParameter('age', 'str', 'Age')]
		});

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
		const typeMismatch = diagnostics.find(d => d.code === DiagnosticCode.PARAM_TYPE_MISMATCH);

		assert.ok(typeMismatch, 'Should detect type mismatch');
		assert.ok(typeMismatch!.message.includes('age'));
		assert.ok(typeMismatch!.message.includes('int'));
		assert.ok(typeMismatch!.message.includes('str'));
	});

	test('DSV103: Should normalize common type aliases', () => {
		// Test multiple aliases in one test to avoid repetition
		const testCases = [
			{ code: 'str', doc: 'string' },
			{ code: 'int', doc: 'integer' },
			{ code: 'bool', doc: 'boolean' },
			{ code: 'dict', doc: 'dictionary' }
		];

		for (const { code, doc } of testCases) {
			const func = createTestFunction({
				parameters: [createTestParameter('param', code)]
			});

			const docstring = createTestDocstring({
				parameters: [createTestDocstringParameter('param', doc, 'Test')]
			});

			const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
			const typeMismatch = diagnostics.find(d => d.code === DiagnosticCode.PARAM_TYPE_MISMATCH);

			assert.strictEqual(
				typeMismatch,
				undefined,
				`Should normalize "${doc}" to "${code}"`
			);
		}
	});

	test('DSV103: Should normalize Optional syntax', () => {
		const func = createTestFunction({
			parameters: [createTestParameter('value', 'int | None', '1', true)]
		});

		const docstring = createTestDocstring({
			parameters: [createTestDocstringParameter('value', 'Optional[int]', 'Value')]
		});

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
		const typeMismatch = diagnostics.find(d => d.code === DiagnosticCode.PARAM_TYPE_MISMATCH);

		assert.strictEqual(typeMismatch, undefined, 'Should normalize Optional[int] to int|none');
	});

	test('DSV103: Should be case-insensitive', () => {
		const func = createTestFunction({
			parameters: [createTestParameter('param', 'str')]
		});

		const docstring = createTestDocstring({
			parameters: [createTestDocstringParameter('param', 'STR', 'Test')]
		});

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
		const typeMismatch = diagnostics.find(d => d.code === DiagnosticCode.PARAM_TYPE_MISMATCH);

		assert.strictEqual(typeMismatch, undefined, 'Should be case-insensitive');
	});

	test('DSV103: Should skip when parameter missing in docstring', () => {
		const func = createTestFunction({
			parameters: [createTestParameter('x', 'int')]
		});

		const docstring = createTestDocstring({
			parameters: []  // No parameters documented
		});

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
		const typeMismatch = diagnostics.filter(d => d.code === DiagnosticCode.PARAM_TYPE_MISMATCH);

		assert.strictEqual(typeMismatch.length, 0, 'Should not check types when param missing in docstring');
	});

	test('DSV103: Should skip self and cls parameters', () => {
		const func = createTestFunction({
			parameters: [
				createTestParameter('self', null),
				createTestParameter('cls', null)
			]
		});

		const docstring = createTestDocstring({
			parameters: [
				createTestDocstringParameter('self', 'SomeClass', 'Self'),
				createTestDocstringParameter('cls', 'type[SomeClass]', 'Class')
			]
		});

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
		const typeMismatch = diagnostics.filter(d => d.code === DiagnosticCode.PARAM_TYPE_MISMATCH);

		assert.strictEqual(typeMismatch.length, 0, 'Should skip implicit parameters');
	});

	test('DSV103: Should skip when code has no type hint', () => {
		const func = createTestFunction({
			parameters: [createTestParameter('x', null)]
		});

		const docstring = createTestDocstring({
			parameters: [createTestDocstringParameter('x', 'int', 'X value')]
		});

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
		const typeMismatch = diagnostics.filter(d => d.code === DiagnosticCode.PARAM_TYPE_MISMATCH);

		assert.strictEqual(typeMismatch.length, 0, 'Should not check when code has no type hint');
	});

	test('DSV103: Should skip when docstring has no type', () => {
		const func = createTestFunction({
			parameters: [createTestParameter('x', 'int')]
		});

		const docstring = createTestDocstring({
			parameters: [createTestDocstringParameter('x', null, 'X value')]
		});

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
		const typeMismatch = diagnostics.filter(d => d.code === DiagnosticCode.PARAM_TYPE_MISMATCH);

		assert.strictEqual(typeMismatch.length, 0, 'Should not check when docstring has no type');
	});

	test('DSV103: Should handle multiple parameters with mixed results', () => {
		const func = createTestFunction({
			parameters: [
				createTestParameter('x', 'int'),
				createTestParameter('y', 'str'),
				createTestParameter('z', 'bool')
			]
		});

		const docstring = createTestDocstring({
			parameters: [
				createTestDocstringParameter('x', 'int', 'X'),  // Match
				createTestDocstringParameter('y', 'int', 'Y'),  // Mismatch!
				createTestDocstringParameter('z', 'boolean', 'Z')  // Match (normalized)
			]
		});

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
		const typeMismatches = diagnostics.filter(d => d.code === DiagnosticCode.PARAM_TYPE_MISMATCH);

		assert.strictEqual(typeMismatches.length, 1, 'Should detect exactly one mismatch');
		assert.ok(typeMismatches[0].message.includes('y'), 'Should report mismatch for y');
	});
});

suite('PythonSignatureAnalyzer - Optional/Required Mismatch Tests', () => {
	let analyzer: PythonSignatureAnalyzer;

	setup(() => {
		analyzer = new PythonSignatureAnalyzer();
	});

	test('DSV104: Should detect when optional in code but required in docstring', () => {
		const func = createTestFunction({
			parameters: [createTestParameter('age', 'int', '25', true)]
		});

		const docstring = createTestDocstring({
			parameters: [createTestDocstringParameter('age', 'int', 'Age', false)]
		});

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
		const optionalMismatch = diagnostics.filter(d => d.code === DiagnosticCode.PARAM_OPTIONAL_MISMATCH);

		assert.strictEqual(optionalMismatch.length, 1, 'Should detect optional mismatch');
		assert.ok(optionalMismatch[0].message.includes('age'));
		assert.ok(optionalMismatch[0].message.includes('optional (has default value)'));
		assert.strictEqual(optionalMismatch[0].severity, vscode.DiagnosticSeverity.Information, 'Should have Information severity');
	});

	test('DSV104: Should detect when required in code but optional in docstring', () => {
		const func = createTestFunction({
			parameters: [createTestParameter('age', 'int')]
		});

		const docstring = createTestDocstring({
			parameters: [createTestDocstringParameter('age', 'int', 'Age', true)]
		});

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
		const optionalMismatch = diagnostics.filter(d => d.code === DiagnosticCode.PARAM_OPTIONAL_MISMATCH);

		assert.strictEqual(optionalMismatch.length, 1, 'Should detect optional mismatch');
		assert.ok(optionalMismatch[0].message.includes('age'));
		assert.ok(optionalMismatch[0].message.includes('required'));
	});

	test('DSV104: Should not report when both are optional', () => {
		const func = createTestFunction({
			parameters: [createTestParameter('age', 'int', '25', true)]
		});

		const docstring = createTestDocstring({
			parameters: [createTestDocstringParameter('age', 'int', 'Age', true)]
		});

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
		const optionalMismatch = diagnostics.filter(d => d.code === DiagnosticCode.PARAM_OPTIONAL_MISMATCH);

		assert.strictEqual(optionalMismatch.length, 0, 'Should not report when both are optional');
	});

	test('DSV104: Should not report when both are required', () => {
		const func = createTestFunction({
			parameters: [createTestParameter('age', 'int')]
		});

		const docstring = createTestDocstring({
			parameters: [createTestDocstringParameter('age', 'int', 'Age', false)]
		});

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
		const optionalMismatch = diagnostics.filter(d => d.code === DiagnosticCode.PARAM_OPTIONAL_MISMATCH);

		assert.strictEqual(optionalMismatch.length, 0, 'Should not report when both are required');
	});

	test('DSV104: Should not report when optional status matches (parameterized)', () => {
		const testCases = [
			{
				name: 'both optional',
				codeOptional: true,
				docOptional: true,
				defaultValue: '25'
			},
			{
				name: 'both required',
				codeOptional: false,
				docOptional: false,
				defaultValue: null
			}
		];

		for (const testCase of testCases) {
			const func = createTestFunction({
				parameters: [createTestParameter('param', 'int', testCase.defaultValue, testCase.codeOptional)]
			});

			const docstring = createTestDocstring({
				parameters: [createTestDocstringParameter('param', 'int', 'Param', testCase.docOptional)]
			});

			const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
			const optionalMismatch = diagnostics.filter(d => d.code === DiagnosticCode.PARAM_OPTIONAL_MISMATCH);

			assert.strictEqual(optionalMismatch.length, 0, `Should not report when ${testCase.name}`);
		}
	});

	test('DSV104: Should not report when docstring does not specify optionality', () => {
		const func = createTestFunction({
			parameters: [createTestParameter('age', 'int', '25', true)]
		});

		const docstring = createTestDocstring({
			parameters: [createTestDocstringParameter('age', 'int', 'Age')]  // isOptional is undefined
		});

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
		const optionalMismatch = diagnostics.filter(d => d.code === DiagnosticCode.PARAM_OPTIONAL_MISMATCH);

		assert.strictEqual(optionalMismatch.length, 0, 'Should not report when docstring does not specify optionality');
	});

	test('DSV104: Should not report when docstring does not specify optionality (required param)', () => {
		const func = createTestFunction({
			parameters: [createTestParameter('name', 'str')]
		});

		const docstring = createTestDocstring({
			parameters: [createTestDocstringParameter('name', 'str', 'Name')]  // isOptional is undefined
		});

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
		const optionalMismatch = diagnostics.filter(d => d.code === DiagnosticCode.PARAM_OPTIONAL_MISMATCH);

		assert.strictEqual(optionalMismatch.length, 0, 'Should not report when docstring does not specify optionality for required param');
	});

	test('DSV104: Should handle multiple parameters with mixed results', () => {
		const func = createTestFunction({
			parameters: [
				createTestParameter('a', 'str'),
				createTestParameter('b', 'int', '1', true),
				createTestParameter('c', 'float')
			]
		});

		const docstring = createTestDocstring({
			parameters: [
				createTestDocstringParameter('a', 'str', 'A', false),  // Match
				createTestDocstringParameter('b', 'int', 'B', false),  // Mismatch!
				createTestDocstringParameter('c', 'float', 'C')  // No optionality specified - no mismatch
			]
		});

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
		const optionalMismatches = diagnostics.filter(d => d.code === DiagnosticCode.PARAM_OPTIONAL_MISMATCH);

		assert.strictEqual(optionalMismatches.length, 1, 'Should detect exactly one mismatch');
		assert.ok(optionalMismatches[0].message.includes('b'), 'Should report mismatch for b');
	});

	test('DSV104: Should skip implicit parameters', () => {
		const func = createTestFunction({
			parameters: [
				createTestParameter('self', null),
				createTestParameter('age', 'int', '25', true)
			]
		});

		const docstring = createTestDocstring({
			parameters: [
				createTestDocstringParameter('self', null, 'Self', false),
				createTestDocstringParameter('age', 'int', 'Age', false)  // Mismatch
			]
		});

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
		const optionalMismatch = diagnostics.filter(d => d.code === DiagnosticCode.PARAM_OPTIONAL_MISMATCH);

		assert.strictEqual(optionalMismatch.length, 1, 'Should only report for age, not self');
		assert.ok(optionalMismatch[0].message.includes('age'));
	});
});
