import * as assert from 'assert';
import * as vscode from 'vscode';
import { PythonSignatureAnalyzer } from '../../../analyzers/python/signatureAnalyzer';
import { FunctionDescriptor, ParameterDescriptor } from '../../../parsers/types';
import { DocstringDescriptor, DocstringParameterDescriptor } from '../../../docstring/types';
import { DiagnosticCode } from '../../../diagnostics/types';

suite('PythonSignatureAnalyzer - Type Mismatch Tests', () => {
	let analyzer: PythonSignatureAnalyzer;
	const testRange = new vscode.Range(0, 0, 10, 0);

	/**
	 * Helper to create a minimal FunctionDescriptor for testing
	 */
	function createFunc(parameters: ParameterDescriptor[]): FunctionDescriptor {
		return {
			name: 'test_func',
			range: testRange,
			parameters,
			returnType: null,
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
	function createDocstring(parameters: DocstringParameterDescriptor[]): DocstringDescriptor {
		return {
			parameters,
			returns: null,
			raises: [],
			notes: null
		};
	}

	setup(() => {
		analyzer = new PythonSignatureAnalyzer();
	});

	test('DSV103: Should detect real type mismatch', () => {
		const func = createFunc([
			{ name: 'age', type: 'int', defaultValue: null, isOptional: false }
		]);

		const docstring = createDocstring([
			{ name: 'age', type: 'str', description: 'Age' }
		]);

		const diagnostics = analyzer.analyze(func, docstring);
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
			const func = createFunc([
				{ name: 'param', type: code, defaultValue: null, isOptional: false }
			]);

			const docstring = createDocstring([
				{ name: 'param', type: doc, description: 'Test' }
			]);

			const diagnostics = analyzer.analyze(func, docstring);
			const typeMismatch = diagnostics.find(d => d.code === DiagnosticCode.PARAM_TYPE_MISMATCH);

			assert.strictEqual(
				typeMismatch,
				undefined,
				`Should normalize "${doc}" to "${code}"`
			);
		}
	});

	test('DSV103: Should normalize Optional syntax', () => {
		const func = createFunc([
			{ name: 'value', type: 'int | None', defaultValue: null, isOptional: true }
		]);

		const docstring = createDocstring([
			{ name: 'value', type: 'Optional[int]', description: 'Value' }
		]);

		const diagnostics = analyzer.analyze(func, docstring);
		const typeMismatch = diagnostics.find(d => d.code === DiagnosticCode.PARAM_TYPE_MISMATCH);

		assert.strictEqual(typeMismatch, undefined, 'Should normalize Optional[int] to int|none');
	});

	test('DSV103: Should be case-insensitive', () => {
		const func = createFunc([
			{ name: 'param', type: 'str', defaultValue: null, isOptional: false }
		]);

		const docstring = createDocstring([
			{ name: 'param', type: 'STR', description: 'Test' }
		]);

		const diagnostics = analyzer.analyze(func, docstring);
		const typeMismatch = diagnostics.find(d => d.code === DiagnosticCode.PARAM_TYPE_MISMATCH);

		assert.strictEqual(typeMismatch, undefined, 'Should be case-insensitive');
	});

	test('DSV103: Should skip when parameter missing in docstring', () => {
		const func = createFunc([
			{ name: 'x', type: 'int', defaultValue: null, isOptional: false }
		]);

		const docstring = createDocstring([]);  // No parameters documented

		const diagnostics = analyzer.analyze(func, docstring);
		const typeMismatch = diagnostics.filter(d => d.code === DiagnosticCode.PARAM_TYPE_MISMATCH);

		assert.strictEqual(typeMismatch.length, 0, 'Should not check types when param missing in docstring');
	});

	test('DSV103: Should skip self and cls parameters', () => {
		const func = createFunc([
			{ name: 'self', type: null, defaultValue: null, isOptional: false },
			{ name: 'cls', type: null, defaultValue: null, isOptional: false }
		]);

		const docstring = createDocstring([
			{ name: 'self', type: 'SomeClass', description: 'Self' },
			{ name: 'cls', type: 'type[SomeClass]', description: 'Class' }
		]);

		const diagnostics = analyzer.analyze(func, docstring);
		const typeMismatch = diagnostics.filter(d => d.code === DiagnosticCode.PARAM_TYPE_MISMATCH);

		assert.strictEqual(typeMismatch.length, 0, 'Should skip implicit parameters');
	});

	test('DSV103: Should skip when code has no type hint', () => {
		const func = createFunc([
			{ name: 'x', type: null, defaultValue: null, isOptional: false }
		]);

		const docstring = createDocstring([
			{ name: 'x', type: 'int', description: 'X value' }
		]);

		const diagnostics = analyzer.analyze(func, docstring);
		const typeMismatch = diagnostics.filter(d => d.code === DiagnosticCode.PARAM_TYPE_MISMATCH);

		assert.strictEqual(typeMismatch.length, 0, 'Should not check when code has no type hint');
	});

	test('DSV103: Should skip when docstring has no type', () => {
		const func = createFunc([
			{ name: 'x', type: 'int', defaultValue: null, isOptional: false }
		]);

		const docstring = createDocstring([
			{ name: 'x', type: null, description: 'X value' }
		]);

		const diagnostics = analyzer.analyze(func, docstring);
		const typeMismatch = diagnostics.filter(d => d.code === DiagnosticCode.PARAM_TYPE_MISMATCH);

		assert.strictEqual(typeMismatch.length, 0, 'Should not check when docstring has no type');
	});

	test('DSV103: Should handle multiple parameters with mixed results', () => {
		const func = createFunc([
			{ name: 'x', type: 'int', defaultValue: null, isOptional: false },
			{ name: 'y', type: 'str', defaultValue: null, isOptional: false },
			{ name: 'z', type: 'bool', defaultValue: null, isOptional: false }
		]);

		const docstring = createDocstring([
			{ name: 'x', type: 'int', description: 'X' },  // Match
			{ name: 'y', type: 'int', description: 'Y' },  // Mismatch!
			{ name: 'z', type: 'boolean', description: 'Z' }  // Match (normalized)
		]);

		const diagnostics = analyzer.analyze(func, docstring);
		const typeMismatches = diagnostics.filter(d => d.code === DiagnosticCode.PARAM_TYPE_MISMATCH);

		assert.strictEqual(typeMismatches.length, 1, 'Should detect exactly one mismatch');
		assert.ok(typeMismatches[0].message.includes('y'), 'Should report mismatch for y');
	});
});

suite('PythonSignatureAnalyzer - Optional/Required Mismatch Tests', () => {
	let analyzer: PythonSignatureAnalyzer;
	const testRange = new vscode.Range(0, 0, 10, 0);

	/**
	 * Helper to create a minimal FunctionDescriptor for testing
	 */
	function createFunc(parameters: ParameterDescriptor[]): FunctionDescriptor {
		return {
			name: 'test_func',
			range: testRange,
			parameters,
			returnType: null,
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
	function createDocstring(parameters: DocstringParameterDescriptor[]): DocstringDescriptor {
		return {
			parameters,
			returns: null,
			raises: [],
			notes: null
		};
	}

	setup(() => {
		analyzer = new PythonSignatureAnalyzer();
	});

	test('DSV104: Should detect when optional in code but required in docstring', () => {
		const func = createFunc([
			{ name: 'age', type: 'int', defaultValue: '25', isOptional: true }
		]);

		const docstring = createDocstring([
			{ name: 'age', type: 'int', description: 'Age', isOptional: false }
		]);

		const diagnostics = analyzer.analyze(func, docstring);
		const optionalMismatch = diagnostics.filter(d => d.code === DiagnosticCode.PARAM_OPTIONAL_MISMATCH);

		assert.strictEqual(optionalMismatch.length, 1, 'Should detect optional mismatch');
		assert.ok(optionalMismatch[0].message.includes('age'));
		assert.ok(optionalMismatch[0].message.includes('optional (has default value)'));
		assert.strictEqual(optionalMismatch[0].severity, vscode.DiagnosticSeverity.Information, 'Should have Information severity');
	});

	test('DSV104: Should detect when required in code but optional in docstring', () => {
		const func = createFunc([
			{ name: 'age', type: 'int', defaultValue: null, isOptional: false }
		]);

		const docstring = createDocstring([
			{ name: 'age', type: 'int', description: 'Age', isOptional: true }
		]);

		const diagnostics = analyzer.analyze(func, docstring);
		const optionalMismatch = diagnostics.filter(d => d.code === DiagnosticCode.PARAM_OPTIONAL_MISMATCH);

		assert.strictEqual(optionalMismatch.length, 1, 'Should detect optional mismatch');
		assert.ok(optionalMismatch[0].message.includes('age'));
		assert.ok(optionalMismatch[0].message.includes('required'));
	});

	test('DSV104: Should not report when both are optional', () => {
		const func = createFunc([
			{ name: 'age', type: 'int', defaultValue: '25', isOptional: true }
		]);

		const docstring = createDocstring([
			{ name: 'age', type: 'int', description: 'Age', isOptional: true }
		]);

		const diagnostics = analyzer.analyze(func, docstring);
		const optionalMismatch = diagnostics.filter(d => d.code === DiagnosticCode.PARAM_OPTIONAL_MISMATCH);

		assert.strictEqual(optionalMismatch.length, 0, 'Should not report when both are optional');
	});

	test('DSV104: Should not report when both are required', () => {
		const func = createFunc([
			{ name: 'age', type: 'int', defaultValue: null, isOptional: false }
		]);

		const docstring = createDocstring([
			{ name: 'age', type: 'int', description: 'Age', isOptional: false }
		]);

		const diagnostics = analyzer.analyze(func, docstring);
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
			const func = createFunc([
				{ name: 'param', type: 'int', defaultValue: testCase.defaultValue, isOptional: testCase.codeOptional }
			]);

			const docstring = createDocstring([
				{ name: 'param', type: 'int', description: 'Param', isOptional: testCase.docOptional }
			]);

			const diagnostics = analyzer.analyze(func, docstring);
			const optionalMismatch = diagnostics.filter(d => d.code === DiagnosticCode.PARAM_OPTIONAL_MISMATCH);

			assert.strictEqual(optionalMismatch.length, 0, `Should not report when ${testCase.name}`);
		}
	});

	test('DSV104: Should not report when docstring does not specify optionality', () => {
		const func = createFunc([
			{ name: 'age', type: 'int', defaultValue: '25', isOptional: true }
		]);

		const docstring = createDocstring([
			{ name: 'age', type: 'int', description: 'Age' }  // isOptional is undefined
		]);

		const diagnostics = analyzer.analyze(func, docstring);
		const optionalMismatch = diagnostics.filter(d => d.code === DiagnosticCode.PARAM_OPTIONAL_MISMATCH);

		assert.strictEqual(optionalMismatch.length, 0, 'Should not report when docstring does not specify optionality');
	});

	test('DSV104: Should not report when docstring does not specify optionality (required param)', () => {
		const func = createFunc([
			{ name: 'name', type: 'str', defaultValue: null, isOptional: false }
		]);

		const docstring = createDocstring([
			{ name: 'name', type: 'str', description: 'Name' }  // isOptional is undefined
		]);

		const diagnostics = analyzer.analyze(func, docstring);
		const optionalMismatch = diagnostics.filter(d => d.code === DiagnosticCode.PARAM_OPTIONAL_MISMATCH);

		assert.strictEqual(optionalMismatch.length, 0, 'Should not report when docstring does not specify optionality for required param');
	});

	test('DSV104: Should handle multiple parameters with mixed results', () => {
		const func = createFunc([
			{ name: 'a', type: 'str', defaultValue: null, isOptional: false },
			{ name: 'b', type: 'int', defaultValue: '1', isOptional: true },
			{ name: 'c', type: 'float', defaultValue: null, isOptional: false }
		]);

		const docstring = createDocstring([
			{ name: 'a', type: 'str', description: 'A', isOptional: false },  // Match
			{ name: 'b', type: 'int', description: 'B', isOptional: false },  // Mismatch!
			{ name: 'c', type: 'float', description: 'C' }  // No optionality specified - no mismatch
		]);

		const diagnostics = analyzer.analyze(func, docstring);
		const optionalMismatches = diagnostics.filter(d => d.code === DiagnosticCode.PARAM_OPTIONAL_MISMATCH);

		assert.strictEqual(optionalMismatches.length, 1, 'Should detect exactly one mismatch');
		assert.ok(optionalMismatches[0].message.includes('b'), 'Should report mismatch for b');
	});

	test('DSV104: Should skip implicit parameters', () => {
		const func = createFunc([
			{ name: 'self', type: null, defaultValue: null, isOptional: false },
			{ name: 'age', type: 'int', defaultValue: '25', isOptional: true }
		]);

		const docstring = createDocstring([
			{ name: 'self', type: null, description: 'Self', isOptional: false },
			{ name: 'age', type: 'int', description: 'Age', isOptional: false }  // Mismatch
		]);

		const diagnostics = analyzer.analyze(func, docstring);
		const optionalMismatch = diagnostics.filter(d => d.code === DiagnosticCode.PARAM_OPTIONAL_MISMATCH);

		assert.strictEqual(optionalMismatch.length, 1, 'Should only report for age, not self');
		assert.ok(optionalMismatch[0].message.includes('age'));
	});
});
