import * as assert from 'assert';
import * as vscode from 'vscode';
import { PythonReturnAnalyzer } from '../../../analyzers/python/returnAnalyzer';
import { DiagnosticCode } from '../../../diagnostics/types';
import {
	createTestFunction,
	createTestDocstring,
	TEST_URI
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

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
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

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
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

			const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
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

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
		const typeMismatch = diagnostics.find(d => d.code === DiagnosticCode.RETURN_TYPE_MISMATCH);

		assert.strictEqual(typeMismatch, undefined, 'Should normalize Optional[int] to int|none');
	});

	test('DSV201: Should be case-insensitive', () => {
		const func = createTestFunction({ returnType: 'str' });
		const docstring = createTestDocstring({
			returnType: 'STR',
			returnDescription: 'Result'
		});

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
		const typeMismatch = diagnostics.find(d => d.code === DiagnosticCode.RETURN_TYPE_MISMATCH);

		assert.strictEqual(typeMismatch, undefined, 'Should be case-insensitive');
	});

	test('DSV201: Should skip when code has no return type', () => {
		const func = createTestFunction({ returnType: null });
		const docstring = createTestDocstring({
			returnType: 'dict',
			returnDescription: 'Result'
		});

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
		const typeMismatch = diagnostics.filter(d => d.code === DiagnosticCode.RETURN_TYPE_MISMATCH);

		assert.strictEqual(typeMismatch.length, 0, 'Should not check when code has no return type');
	});

	test('DSV201: Should skip when docstring has no return type', () => {
		const func = createTestFunction({ returnType: 'dict' });
		const docstring = createTestDocstring({
			returnType: null,
			returnDescription: 'Result'
		});

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
		const typeMismatch = diagnostics.filter(d => d.code === DiagnosticCode.RETURN_TYPE_MISMATCH);

		assert.strictEqual(typeMismatch.length, 0, 'Should not check when docstring has no return type');
	});

	test('DSV201: Should handle complex types', () => {
		const func = createTestFunction({ returnType: 'list[int]' });
		const docstring = createTestDocstring({
			returnType: 'list[int]',
			returnDescription: 'List of numbers'
		});

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
		const typeMismatch = diagnostics.find(d => d.code === DiagnosticCode.RETURN_TYPE_MISMATCH);

		assert.strictEqual(typeMismatch, undefined, 'Should handle complex types');
	});

	test('DSV201: Should detect mismatch in complex types', () => {
		const func = createTestFunction({ returnType: 'list[int]' });
		const docstring = createTestDocstring({
			returnType: 'list[str]',
			returnDescription: 'List of strings'
		});

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
		const typeMismatch = diagnostics.find(d => d.code === DiagnosticCode.RETURN_TYPE_MISMATCH);

		assert.ok(typeMismatch, 'Should detect mismatch in complex types');
		assert.ok(typeMismatch!.message.includes('list[int]'));
		assert.ok(typeMismatch!.message.includes('list[str]'));
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

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
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

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
		const missingReturn = diagnostics.find(d => d.code === DiagnosticCode.RETURN_MISSING_IN_DOCSTRING);

		assert.strictEqual(missingReturn, undefined, 'Should not report for None return type');
	});

	test('DSV202: Should not report when function has no return type', () => {
		const func = createTestFunction({ returnType: null });
		const docstring = createTestDocstring({
			parameters: []  // No returns section
		});

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
		const missingReturn = diagnostics.find(d => d.code === DiagnosticCode.RETURN_MISSING_IN_DOCSTRING);

		assert.strictEqual(missingReturn, undefined, 'Should not report when no return type');
	});

	test('DSV202: Should not report when docstring has returns section', () => {
		const func = createTestFunction({ returnType: 'dict' });
		const docstring = createTestDocstring({
			returnType: 'dict',
			returnDescription: 'User data'
		});

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
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

			const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
			const missingReturn = diagnostics.find(d => d.code === DiagnosticCode.RETURN_MISSING_IN_DOCSTRING);

			assert.strictEqual(
				missingReturn,
				undefined,
				`Should not report for '${noneVariant}' return type`
			);
		}
	});

	test('DSV202: Should work together with DSV201 (both checks)', () => {
		// Function has return type but wrong in docstring
		const func = createTestFunction({ returnType: 'dict' });
		const docstring = createTestDocstring({
			returnType: 'list',  // Wrong type
			returnDescription: 'Data'
		});

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);

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

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
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

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
		const typeMismatch = diagnostics.find(d => d.code === DiagnosticCode.RETURN_TYPE_MISMATCH);
		const missingReturn = diagnostics.find(d => d.code === DiagnosticCode.RETURN_MISSING_IN_DOCSTRING);

		assert.ok(typeMismatch, 'Should detect type mismatch for None vs dict');
		assert.strictEqual(missingReturn, undefined, 'Should not report missing return for None');
	});

	test('Edge Case: No return type but documented return should trigger DSV203', () => {
		// This is DSV203: void function with documented return
		const func = createTestFunction({ returnType: null });
		const docstring = createTestDocstring({
			returnType: 'dict',
			returnDescription: 'Some data'
		});

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
		const voidMismatch = diagnostics.find(d => d.code === DiagnosticCode.RETURN_DOCUMENTED_BUT_VOID);

		// DSV203 should trigger
		assert.ok(voidMismatch, 'Should report DSV203 for void function with documented return');
		assert.strictEqual(diagnostics.length, 1, 'Should only report DSV203');
	});

	test('Edge Case: Optional[None] should be documented (not skipped like plain None)', () => {
		const func = createTestFunction({ returnType: 'Optional[None]' });
		const docstring = createTestDocstring({
			parameters: []  // No returns section
		});

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
		const missingReturn = diagnostics.find(d => d.code === DiagnosticCode.RETURN_MISSING_IN_DOCSTRING);

		assert.ok(missingReturn, 'Should report missing return for Optional[None]');
		assert.ok(missingReturn!.message.includes('Optional[None]'));
	});

	test('Edge Case: Union with None should be documented', () => {
		const func = createTestFunction({ returnType: 'str | None' });
		const docstring = createTestDocstring({
			parameters: []  // No returns section
		});

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
		const missingReturn = diagnostics.find(d => d.code === DiagnosticCode.RETURN_MISSING_IN_DOCSTRING);

		assert.ok(missingReturn, 'Should report missing return for str | None');
		assert.ok(missingReturn!.message.includes('str | None'));
	});
});

suite('PythonReturnAnalyzer - Documented Return But Void Function Tests', () => {
	let analyzer: PythonReturnAnalyzer;

	setup(() => {
		analyzer = new PythonReturnAnalyzer();
	});

	test('DSV203: Should detect when docstring has return but function is void (no return type)', () => {
		const func = createTestFunction({ returnType: null });
		const docstring = createTestDocstring({
			returnType: 'dict',
			returnDescription: 'User data'
		});

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
		const voidMismatch = diagnostics.find(d => d.code === DiagnosticCode.RETURN_DOCUMENTED_BUT_VOID);

		assert.ok(voidMismatch, 'Should detect documented return for void function');
		assert.ok(voidMismatch!.message.includes('void'));
		assert.ok(voidMismatch!.message.includes('dict'));
		assert.strictEqual(voidMismatch!.severity, vscode.DiagnosticSeverity.Warning);
	});

	test('DSV203: Should detect when docstring has return but function returns None', () => {
		const func = createTestFunction({ returnType: 'None' });
		const docstring = createTestDocstring({
			returnType: 'str',
			returnDescription: 'Result'
		});

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
		const voidMismatch = diagnostics.find(d => d.code === DiagnosticCode.RETURN_DOCUMENTED_BUT_VOID);

		assert.ok(voidMismatch, 'Should detect documented return for None function');
		assert.ok(voidMismatch!.message.includes('void'));
		assert.ok(voidMismatch!.message.includes('str'));
	});

	test('DSV203: Should handle case-insensitive None check', () => {
		const testCases = ['none', 'None', 'NONE', 'nOnE'];

		for (const noneVariant of testCases) {
			const func = createTestFunction({ returnType: noneVariant });
			const docstring = createTestDocstring({
				returnType: 'dict',
				returnDescription: 'Data'
			});

			const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
			const voidMismatch = diagnostics.find(d => d.code === DiagnosticCode.RETURN_DOCUMENTED_BUT_VOID);

			assert.ok(
				voidMismatch,
				`Should detect documented return for '${noneVariant}' function`
			);
		}
	});

	test('DSV203: Should not report when function has actual return type', () => {
		const func = createTestFunction({ returnType: 'dict' });
		const docstring = createTestDocstring({
			returnType: 'dict',
			returnDescription: 'Data'
		});

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
		const voidMismatch = diagnostics.find(d => d.code === DiagnosticCode.RETURN_DOCUMENTED_BUT_VOID);

		assert.strictEqual(voidMismatch, undefined, 'Should not report when function has return type');
	});

	test('DSV203: Should not report when docstring has no returns section', () => {
		const func = createTestFunction({ returnType: null });
		const docstring = createTestDocstring({
			parameters: []  // No returns section
		});

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
		const voidMismatch = diagnostics.find(d => d.code === DiagnosticCode.RETURN_DOCUMENTED_BUT_VOID);

		assert.strictEqual(voidMismatch, undefined, 'Should not report when no returns section');
	});

	test('DSV203: Should handle docstring with returns but no type specified', () => {
		const func = createTestFunction({ returnType: null });
		const docstring = createTestDocstring({
			returnType: null,  // Returns section exists but no type
			returnDescription: 'Some result'
		});

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
		const voidMismatch = diagnostics.find(d => d.code === DiagnosticCode.RETURN_DOCUMENTED_BUT_VOID);

		assert.ok(voidMismatch, 'Should report even when return type is not specified');
		assert.ok(voidMismatch!.message.includes('void'));
	});

	test('DSV203: Should work independently of DSV201 and DSV202', () => {
		// Void function with documented return should only trigger DSV203
		const func = createTestFunction({ returnType: null });
		const docstring = createTestDocstring({
			returnType: 'dict',
			returnDescription: 'Data'
		});

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
		const typeMismatch = diagnostics.find(d => d.code === DiagnosticCode.RETURN_TYPE_MISMATCH);
		const missingReturn = diagnostics.find(d => d.code === DiagnosticCode.RETURN_MISSING_IN_DOCSTRING);
		const voidMismatch = diagnostics.find(d => d.code === DiagnosticCode.RETURN_DOCUMENTED_BUT_VOID);

		assert.strictEqual(typeMismatch, undefined, 'Should not trigger DSV201');
		assert.strictEqual(missingReturn, undefined, 'Should not trigger DSV202');
		assert.ok(voidMismatch, 'Should trigger DSV203');
		assert.strictEqual(diagnostics.length, 1, 'Should only report DSV203');
	});

	test('DSV203: Should not report for Optional or Union types with None', () => {
		// Optional[str] and str | None are not void functions
		const testCases = ['str | None', 'Optional[str]', 'int | None'];

		for (const returnType of testCases) {
			const func = createTestFunction({ returnType });
			const docstring = createTestDocstring({
				returnType: returnType,
				returnDescription: 'Result'
			});

			const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
			const voidMismatch = diagnostics.find(d => d.code === DiagnosticCode.RETURN_DOCUMENTED_BUT_VOID);

			assert.strictEqual(
				voidMismatch,
				undefined,
				`Should not report for '${returnType}' (not a void function)`
			);
		}
	});
});

suite('PythonReturnAnalyzer - Multiple Returns and Generators Tests', () => {
	let analyzer: PythonReturnAnalyzer;

	setup(() => {
		analyzer = new PythonReturnAnalyzer();
	});

	test('DSV204: Should detect multiple inconsistent return types', () => {
		const func = createTestFunction({
			returnType: 'str | int',
			returnStatements: [
				{ type: 'str', line: 5 },
				{ type: 'int', line: 8 },
				{ type: 'bool', line: 12 }
			]
		});
		const docstring = createTestDocstring({
			returnType: 'str | int',
			returnDescription: 'Result'
		});

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
		const inconsistent = diagnostics.find(d => d.code === DiagnosticCode.RETURN_MULTIPLE_INCONSISTENT);

		assert.ok(inconsistent, 'Should detect multiple inconsistent return types');
		assert.ok(inconsistent!.message.includes('str'));
		assert.ok(inconsistent!.message.includes('int'));
		assert.ok(inconsistent!.message.includes('bool'));
		assert.strictEqual(inconsistent!.severity, vscode.DiagnosticSeverity.Information);
	});

	test('DSV204: Should not report when all return types are the same', () => {
		const func = createTestFunction({
			returnType: 'str',
			returnStatements: [
				{ type: 'str', line: 5 },
				{ type: 'str', line: 8 },
				{ type: 'str', line: 12 }
			]
		});
		const docstring = createTestDocstring({
			returnType: 'str',
			returnDescription: 'Result'
		});

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
		const inconsistent = diagnostics.find(d => d.code === DiagnosticCode.RETURN_MULTIPLE_INCONSISTENT);

		assert.strictEqual(inconsistent, undefined, 'Should not report when all types are the same');
	});

	test('DSV204: Should normalize types before comparison', () => {
		const func = createTestFunction({
			returnType: 'str',
			returnStatements: [
				{ type: 'str', line: 5 },
				{ type: 'string', line: 8 },
				{ type: 'STR', line: 12 }
			]
		});
		const docstring = createTestDocstring({
			returnType: 'str',
			returnDescription: 'Result'
		});

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
		const inconsistent = diagnostics.find(d => d.code === DiagnosticCode.RETURN_MULTIPLE_INCONSISTENT);

		assert.strictEqual(inconsistent, undefined, 'Should normalize types before comparison');
	});

	test('DSV204: Should skip when function has less than 2 returns', () => {
		const func = createTestFunction({
			returnType: 'str',
			returnStatements: [
				{ type: 'str', line: 5 }
			]
		});
		const docstring = createTestDocstring({
			returnType: 'str',
			returnDescription: 'Result'
		});

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
		const inconsistent = diagnostics.find(d => d.code === DiagnosticCode.RETURN_MULTIPLE_INCONSISTENT);

		assert.strictEqual(inconsistent, undefined, 'Should not check with less than 2 returns');
	});

	test('DSV204: Should skip for generator functions', () => {
		const func = createTestFunction({
			returnType: 'Generator[str, None, None]',
			returnStatements: [
				{ type: 'str', line: 5 },
				{ type: 'int', line: 8 }
			],
			isGenerator: true,
			yieldStatements: [
				{ type: 'str', line: 6 }
			]
		});
		const docstring = createTestDocstring({
			returnType: 'Generator[str, None, None]',
			returnDescription: 'Yields values'
		});

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
		const inconsistent = diagnostics.find(d => d.code === DiagnosticCode.RETURN_MULTIPLE_INCONSISTENT);

		assert.strictEqual(inconsistent, undefined, 'Should skip for generators');
	});

	test('DSV205: Should detect generator with Returns instead of Yields', () => {
		const func = createTestFunction({
			isGenerator: true,
			returnType: 'Generator[int, None, None]',
			yieldStatements: [
				{ type: 'int', line: 5 }
			]
		});
		const docstring = createTestDocstring({
			returnType: 'Generator[int, None, None]',
			returnDescription: 'Yields values'
		});

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
		const generatorIssue = diagnostics.find(d => d.code === DiagnosticCode.GENERATOR_SHOULD_YIELD);

		assert.ok(generatorIssue, 'Should detect generator with Returns section');
		assert.ok(generatorIssue!.message.includes('Yields'));
		assert.ok(generatorIssue!.message.includes('Generator'));
		assert.strictEqual(generatorIssue!.severity, vscode.DiagnosticSeverity.Warning);
	});

	test('DSV205: Should not report when generator has no Returns section', () => {
		const func = createTestFunction({
			isGenerator: true,
			returnType: 'Generator[int, None, None]',
			yieldStatements: [
				{ type: 'int', line: 5 }
			]
		});
		const docstring = createTestDocstring({
			parameters: []  // No returns section
		});

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
		const generatorIssue = diagnostics.find(d => d.code === DiagnosticCode.GENERATOR_SHOULD_YIELD);

		assert.strictEqual(generatorIssue, undefined, 'Should not report when no Returns section');
	});

	test('DSV205: Should not report for non-generator functions', () => {
		const func = createTestFunction({
			isGenerator: false,
			returnType: 'list[int]',
			returnStatements: [
				{ type: 'list', line: 5 }
			]
		});
		const docstring = createTestDocstring({
			returnType: 'list[int]',
			returnDescription: 'List of values'
		});

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
		const generatorIssue = diagnostics.find(d => d.code === DiagnosticCode.GENERATOR_SHOULD_YIELD);

		assert.strictEqual(generatorIssue, undefined, 'Should not report for non-generators');
	});

	test('DSV204 + DSV205: Multiple checks should work independently', () => {
		// Generator with inconsistent returns should only report DSV205
		const func = createTestFunction({
			isGenerator: true,
			returnType: 'Generator[str, None, None]',
			returnStatements: [
				{ type: 'str', line: 5 },
				{ type: 'int', line: 8 }
			],
			yieldStatements: [
				{ type: 'str', line: 6 }
			]
		});
		const docstring = createTestDocstring({
			returnType: 'Generator[str, None, None]',
			returnDescription: 'Values'
		});

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
		const generatorIssue = diagnostics.find(d => d.code === DiagnosticCode.GENERATOR_SHOULD_YIELD);
		const inconsistent = diagnostics.find(d => d.code === DiagnosticCode.RETURN_MULTIPLE_INCONSISTENT);

		assert.ok(generatorIssue, 'Should report DSV205');
		assert.strictEqual(inconsistent, undefined, 'Should not report DSV204 for generators');
	});

	test('DSV204: Should handle None in multiple returns', () => {
		const func = createTestFunction({
			returnType: 'str | None',
			returnStatements: [
				{ type: 'str', line: 5 },
				{ type: 'None', line: 8 },
				{ type: 'int', line: 12 }
			]
		});
		const docstring = createTestDocstring({
			returnType: 'str | None',
			returnDescription: 'Result'
		});

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
		const inconsistent = diagnostics.find(d => d.code === DiagnosticCode.RETURN_MULTIPLE_INCONSISTENT);

		assert.ok(inconsistent, 'Should detect None mixed with str and int');
		assert.ok(inconsistent!.message.includes('str'));
		assert.ok(inconsistent!.message.includes('none'));
		assert.ok(inconsistent!.message.includes('int'));
	});

	test('DSV204: Should handle null types (inference failed) gracefully', () => {
		const func = createTestFunction({
			returnType: 'str',
			returnStatements: [
				{ type: 'str', line: 5 },
				{ type: null, line: 8 },  // Type inference failed
				{ type: 'str', line: 12 }
			]
		});
		const docstring = createTestDocstring({
			returnType: 'str',
			returnDescription: 'Result'
		});

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
		const inconsistent = diagnostics.find(d => d.code === DiagnosticCode.RETURN_MULTIPLE_INCONSISTENT);

		// Should not crash and should not report (only known types are str)
		assert.strictEqual(inconsistent, undefined, 'Should skip null types gracefully');
	});

	test('DSV205: Should handle async generators', () => {
		const func = createTestFunction({
			isGenerator: true,
			isAsync: true,
			returnType: 'AsyncGenerator[int, None, None]',
			yieldStatements: [
				{ type: 'int', line: 5 }
			]
		});
		const docstring = createTestDocstring({
			returnType: 'AsyncGenerator[int, None, None]',
			returnDescription: 'Async values'
		});

		const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
		const generatorIssue = diagnostics.find(d => d.code === DiagnosticCode.GENERATOR_SHOULD_YIELD);

		assert.ok(generatorIssue, 'Should detect async generator with Returns');
	});
});


