import * as assert from 'assert';
import * as vscode from 'vscode';
import { PythonExceptionAnalyzer } from '../../../analyzers/python/exceptionAnalyzer';
import { DiagnosticCode } from '../../../diagnostics/types';
import {
	createTestFunction,
	createTestDocstring,
	TEST_URI
} from './testUtils';

suite('PythonExceptionAnalyzer - Exception Validation Tests', () => {
	let analyzer: PythonExceptionAnalyzer;

	setup(() => {
		analyzer = new PythonExceptionAnalyzer();
	});

	suite('DSV301: Exception raised but not documented', () => {
		test('Should detect single undocumented exception', () => {
			const func = createTestFunction({
				raises: [{ type: 'ValueError', line: 5 }]
			});
			const docstring = createTestDocstring({
				raises: [] // No exceptions documented
			});

			const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
			const undocumented = diagnostics.find(d => d.code === DiagnosticCode.EXCEPTION_UNDOCUMENTED);

			assert.ok(undocumented, 'Should detect undocumented ValueError');
			assert.ok(undocumented!.message.includes('ValueError'));
			assert.strictEqual(undocumented!.severity, vscode.DiagnosticSeverity.Warning);
		});

		test('Should detect multiple undocumented exceptions', () => {
			const func = createTestFunction({
				raises: [
					{ type: 'ValueError', line: 5 },
					{ type: 'TypeError', line: 8 },
					{ type: 'KeyError', line: 12 }
				]
			});
			const docstring = createTestDocstring({
				raises: [] // No exceptions documented
			});

			const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
			const undocumented = diagnostics.filter(d => d.code === DiagnosticCode.EXCEPTION_UNDOCUMENTED);

			assert.strictEqual(undocumented.length, 3, 'Should detect all 3 undocumented exceptions');
		});

		test('Should detect partially documented exceptions', () => {
			const func = createTestFunction({
				raises: [
					{ type: 'ValueError', line: 5 },
					{ type: 'TypeError', line: 8 }
				]
			});
			const docstring = createTestDocstring({
				raises: [{ type: 'ValueError', description: 'Invalid value' }]
			});

			const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
			const undocumented = diagnostics.filter(d => d.code === DiagnosticCode.EXCEPTION_UNDOCUMENTED);

			assert.strictEqual(undocumented.length, 1, 'Should detect only TypeError as undocumented');
			assert.ok(undocumented[0].message.includes('TypeError'));
		});

		test('Should not report when all exceptions are documented', () => {
			const func = createTestFunction({
				raises: [
					{ type: 'ValueError', line: 5 },
					{ type: 'TypeError', line: 8 }
				]
			});
			const docstring = createTestDocstring({
				raises: [
					{ type: 'ValueError', description: 'Invalid value' },
					{ type: 'TypeError', description: 'Wrong type' }
				]
			});

			const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
			const undocumented = diagnostics.filter(d => d.code === DiagnosticCode.EXCEPTION_UNDOCUMENTED);

			assert.strictEqual(undocumented.length, 0, 'Should not report when all exceptions documented');
		});

		test('Should handle case-insensitive exception matching', () => {
			const func = createTestFunction({
				raises: [{ type: 'ValueError', line: 5 }]
			});
			const docstring = createTestDocstring({
				raises: [{ type: 'valueerror', description: 'Invalid value' }]
			});

			const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
			const undocumented = diagnostics.filter(d => d.code === DiagnosticCode.EXCEPTION_UNDOCUMENTED);

			assert.strictEqual(undocumented.length, 0, 'Should match ValueError and valueerror');
		});

		test('Should handle builtins prefix', () => {
			const func = createTestFunction({
				raises: [{ type: 'builtins.ValueError', line: 5 }]
			});
			const docstring = createTestDocstring({
				raises: [{ type: 'ValueError', description: 'Invalid value' }]
			});

			const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
			const undocumented = diagnostics.filter(d => d.code === DiagnosticCode.EXCEPTION_UNDOCUMENTED);

			assert.strictEqual(undocumented.length, 0, 'Should match builtins.ValueError with ValueError');
		});
	});

	suite('DSV302: Exception documented but not raised', () => {
		test('Should detect single documented but not raised exception', () => {
			const func = createTestFunction({
				raises: [] // No exceptions raised
			});
			const docstring = createTestDocstring({
				raises: [{ type: 'ValueError', description: 'Invalid value' }]
			});

			const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
			const notRaised = diagnostics.find(d => d.code === DiagnosticCode.EXCEPTION_NOT_RAISED);

			assert.ok(notRaised, 'Should detect documented but not raised ValueError');
			assert.ok(notRaised!.message.includes('ValueError'));
			assert.strictEqual(notRaised!.severity, vscode.DiagnosticSeverity.Information);
		});

		test('Should detect multiple documented but not raised exceptions', () => {
			const func = createTestFunction({
				raises: [] // No exceptions raised
			});
			const docstring = createTestDocstring({
				raises: [
					{ type: 'ValueError', description: 'Invalid value' },
					{ type: 'TypeError', description: 'Wrong type' },
					{ type: 'KeyError', description: 'Missing key' }
				]
			});

			const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
			const notRaised = diagnostics.filter(d => d.code === DiagnosticCode.EXCEPTION_NOT_RAISED);

			assert.strictEqual(notRaised.length, 3, 'Should detect all 3 documented but not raised exceptions');
		});

		test('Should detect partially raised exceptions', () => {
			const func = createTestFunction({
				raises: [{ type: 'ValueError', line: 5 }]
			});
			const docstring = createTestDocstring({
				raises: [
					{ type: 'ValueError', description: 'Invalid value' },
					{ type: 'TypeError', description: 'Wrong type' }
				]
			});

			const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
			const notRaised = diagnostics.filter(d => d.code === DiagnosticCode.EXCEPTION_NOT_RAISED);

			assert.strictEqual(notRaised.length, 1, 'Should detect only TypeError as not raised');
			assert.ok(notRaised[0].message.includes('TypeError'));
		});

		test('Should not report when all documented exceptions are raised', () => {
			const func = createTestFunction({
				raises: [
					{ type: 'ValueError', line: 5 },
					{ type: 'TypeError', line: 8 }
				]
			});
			const docstring = createTestDocstring({
				raises: [
					{ type: 'ValueError', description: 'Invalid value' },
					{ type: 'TypeError', description: 'Wrong type' }
				]
			});

			const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
			const notRaised = diagnostics.filter(d => d.code === DiagnosticCode.EXCEPTION_NOT_RAISED);

			assert.strictEqual(notRaised.length, 0, 'Should not report when all documented exceptions are raised');
		});

		test('Should not report when no exceptions are documented', () => {
			const func = createTestFunction({
				raises: [{ type: 'ValueError', line: 5 }]
			});
			const docstring = createTestDocstring({
				raises: [] // No exceptions documented
			});

			const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
			const notRaised = diagnostics.filter(d => d.code === DiagnosticCode.EXCEPTION_NOT_RAISED);

			assert.strictEqual(notRaised.length, 0, 'Should not report DSV302 when no exceptions documented');
		});
	});

	suite('Edge Cases', () => {
		test('Should skip analysis when function has no docstring', () => {
			const func = createTestFunction({
				docstring: null,
				docstringRange: null,
				raises: [{ type: 'ValueError', line: 5 }]
			});
			const docstring = createTestDocstring({
				raises: []
			});

			const diagnostics = analyzer.analyze(func, docstring, TEST_URI);

			assert.strictEqual(diagnostics.length, 0, 'Should skip analysis when no docstring');
		});

		test('Should handle function with no exceptions at all', () => {
			const func = createTestFunction({
				raises: []
			});
			const docstring = createTestDocstring({
				raises: []
			});

			const diagnostics = analyzer.analyze(func, docstring, TEST_URI);

			assert.strictEqual(diagnostics.length, 0, 'Should handle no exceptions gracefully');
		});

		test('Should handle custom exception classes', () => {
			const func = createTestFunction({
				raises: [{ type: 'CustomError', line: 5 }]
			});
			const docstring = createTestDocstring({
				raises: [{ type: 'CustomError', description: 'Custom error occurred' }]
			});

			const diagnostics = analyzer.analyze(func, docstring, TEST_URI);

			assert.strictEqual(diagnostics.length, 0, 'Should handle custom exceptions');
		});

		test('Should handle both DSV301 and DSV302 simultaneously', () => {
			const func = createTestFunction({
				raises: [
					{ type: 'ValueError', line: 5 },
					{ type: 'KeyError', line: 8 }
				]
			});
			const docstring = createTestDocstring({
				raises: [
					{ type: 'ValueError', description: 'Invalid value' },
					{ type: 'TypeError', description: 'Wrong type' }
				]
			});

			const diagnostics = analyzer.analyze(func, docstring, TEST_URI);
			const undocumented = diagnostics.filter(d => d.code === DiagnosticCode.EXCEPTION_UNDOCUMENTED);
			const notRaised = diagnostics.filter(d => d.code === DiagnosticCode.EXCEPTION_NOT_RAISED);

			assert.strictEqual(undocumented.length, 1, 'Should detect KeyError as undocumented');
			assert.strictEqual(notRaised.length, 1, 'Should detect TypeError as not raised');
			assert.ok(undocumented[0].message.includes('KeyError'));
			assert.ok(notRaised[0].message.includes('TypeError'));
		});
	});
});
