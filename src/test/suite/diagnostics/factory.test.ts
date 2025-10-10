/**
 * Tests for DiagnosticFactory.
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { DiagnosticFactory } from '../../../diagnostics/factory';
import { DiagnosticCode, Mismatch } from '../../../diagnostics/types';

suite('DiagnosticFactory Tests', () => {

	suite('createFromMismatch', () => {

		test('Should create diagnostic from mismatch', () => {
			const mismatch: Mismatch = {
				code: DiagnosticCode.PARAM_MISSING_IN_DOCSTRING,
				message: 'Test message',
				range: new vscode.Range(0, 0, 0, 10),
				severity: vscode.DiagnosticSeverity.Warning
			};

			const diagnostic = DiagnosticFactory.createFromMismatch(mismatch);

			assert.strictEqual(diagnostic.code, DiagnosticCode.PARAM_MISSING_IN_DOCSTRING);
			assert.strictEqual(diagnostic.message, 'Test message');
			assert.strictEqual(diagnostic.source, 'docstring-verifier');
			assert.strictEqual(diagnostic.severity, vscode.DiagnosticSeverity.Warning);
			assert.strictEqual(diagnostic.range.start.line, 0);
			assert.strictEqual(diagnostic.range.end.line, 0);
		});

	});

	suite('createParamMissingInDocstring (DSV102)', () => {

		test('Should create diagnostic with correct message', () => {
			const range = new vscode.Range(1, 0, 1, 20);
			const diagnostic = DiagnosticFactory.createParamMissingInDocstring(
				'username',
				'login',
				range
			);

			assert.strictEqual(diagnostic.code, DiagnosticCode.PARAM_MISSING_IN_DOCSTRING);
			assert.strictEqual(
				diagnostic.message,
				"Parameter 'username' is missing in docstring. Add it to the Args section."
			);
			assert.strictEqual(diagnostic.source, 'docstring-verifier');
			assert.strictEqual(diagnostic.severity, vscode.DiagnosticSeverity.Warning);
			assert.strictEqual(diagnostic.range, range);
		});

		test('Should include related information when provided', () => {
			const range = new vscode.Range(1, 0, 1, 20);
			const paramLocation = new vscode.Location(
				vscode.Uri.file('/test/file.py'),
				new vscode.Position(0, 10)
			);

			const diagnostic = DiagnosticFactory.createParamMissingInDocstring(
				'password',
				'authenticate',
				range,
				paramLocation
			);

			assert.ok(diagnostic.relatedInformation);
			assert.strictEqual(diagnostic.relatedInformation.length, 1);
			assert.strictEqual(
				diagnostic.relatedInformation[0].message,
				"Parameter 'password' is defined here in function signature"
			);
			assert.strictEqual(diagnostic.relatedInformation[0].location, paramLocation);
		});

		test('Should not have related information when not provided', () => {
			const range = new vscode.Range(1, 0, 1, 20);
			const diagnostic = DiagnosticFactory.createParamMissingInDocstring(
				'test',
				'func',
				range
			);

			assert.strictEqual(diagnostic.relatedInformation, undefined);
		});

	});

	suite('createParamMissingInCode (DSV101)', () => {

		test('Should create diagnostic with correct message', () => {
			const range = new vscode.Range(2, 4, 2, 20);
			const diagnostic = DiagnosticFactory.createParamMissingInCode(
				'old_param',
				'process',
				range
			);

			assert.strictEqual(diagnostic.code, DiagnosticCode.PARAM_MISSING_IN_CODE);
			assert.strictEqual(
				diagnostic.message,
				"Parameter 'old_param' is documented but not found in function 'process'. Remove it from docstring or add to function signature."
			);
			assert.strictEqual(diagnostic.source, 'docstring-verifier');
			assert.strictEqual(diagnostic.severity, vscode.DiagnosticSeverity.Warning);
		});

	});

	suite('createParamTypeMismatch (DSV103)', () => {

		test('Should create diagnostic with both types', () => {
			const range = new vscode.Range(3, 0, 3, 30);
			const diagnostic = DiagnosticFactory.createParamTypeMismatch(
				'count',
				'calculate',
				'int',
				'str',
				range
			);

			assert.strictEqual(diagnostic.code, DiagnosticCode.PARAM_TYPE_MISMATCH);
			assert.strictEqual(
				diagnostic.message,
				"Parameter 'count' type mismatch: code has 'int', docstring has 'str'. Update docstring to match code."
			);
			assert.strictEqual(diagnostic.severity, vscode.DiagnosticSeverity.Warning);
		});

		test('Should handle null code type', () => {
			const range = new vscode.Range(3, 0, 3, 30);
			const diagnostic = DiagnosticFactory.createParamTypeMismatch(
				'data',
				'process',
				null,
				'str',
				range
			);

			assert.ok(diagnostic.message.includes('no type hint'));
			assert.ok(diagnostic.message.includes("docstring has 'str'"));
		});

		test('Should handle null doc type', () => {
			const range = new vscode.Range(3, 0, 3, 30);
			const diagnostic = DiagnosticFactory.createParamTypeMismatch(
				'value',
				'test',
				'int',
				null,
				range
			);

			assert.ok(diagnostic.message.includes("code has 'int'"));
			assert.ok(diagnostic.message.includes('no type'));
		});

		test('Should handle both null types', () => {
			const range = new vscode.Range(3, 0, 3, 30);
			const diagnostic = DiagnosticFactory.createParamTypeMismatch(
				'item',
				'func',
				null,
				null,
				range
			);

			assert.ok(diagnostic.message.includes('no type hint'));
			assert.ok(diagnostic.message.includes('no type'));
		});

	});

	suite('createParamOptionalMismatch (DSV104)', () => {

		test('Should create diagnostic for optional in code', () => {
			const range = new vscode.Range(4, 0, 4, 40);
			const diagnostic = DiagnosticFactory.createParamOptionalMismatch(
				'timeout',
				'fetch',
				true, // optional in code
				range
			);

			assert.strictEqual(diagnostic.code, DiagnosticCode.PARAM_OPTIONAL_MISMATCH);
			assert.ok(diagnostic.message.includes('optional (has default value)'));
			assert.ok(diagnostic.message.includes('required'));
			assert.strictEqual(diagnostic.severity, vscode.DiagnosticSeverity.Information);
		});

		test('Should create diagnostic for required in code', () => {
			const range = new vscode.Range(4, 0, 4, 40);
			const diagnostic = DiagnosticFactory.createParamOptionalMismatch(
				'user_id',
				'get_user',
				false, // required in code
				range
			);

			assert.strictEqual(diagnostic.code, DiagnosticCode.PARAM_OPTIONAL_MISMATCH);
			assert.ok(diagnostic.message.includes('required'));
			assert.ok(diagnostic.message.includes('optional'));
		});

	});

	suite('createReturnTypeMismatch (DSV201)', () => {

		test('Should create diagnostic with correct message', () => {
			const range = new vscode.Range(5, 0, 5, 50);
			const diagnostic = DiagnosticFactory.createReturnTypeMismatch(
				'calculate',
				'int',
				'str',
				range
			);

			assert.strictEqual(diagnostic.code, DiagnosticCode.RETURN_TYPE_MISMATCH);
			assert.strictEqual(
				diagnostic.message,
				"Return type mismatch: code returns 'int', docstring documents 'str'. Update Returns section to match code."
			);
			assert.strictEqual(diagnostic.severity, vscode.DiagnosticSeverity.Warning);
		});

	});

	suite('createReturnMissingInDocstring (DSV202)', () => {

		test('Should create diagnostic without related info', () => {
			const range = new vscode.Range(6, 0, 6, 30);
			const diagnostic = DiagnosticFactory.createReturnMissingInDocstring(
				'process',
				'dict',
				range
			);

			assert.strictEqual(diagnostic.code, DiagnosticCode.RETURN_MISSING_IN_DOCSTRING);
			assert.ok(diagnostic.message.includes("returns 'dict'"));
			assert.ok(diagnostic.message.includes('not documented'));
			assert.strictEqual(diagnostic.relatedInformation, undefined);
		});

		test('Should include related information when provided', () => {
			const range = new vscode.Range(6, 0, 6, 30);
			const returnLocation = new vscode.Location(
				vscode.Uri.file('/test/file.py'),
				new vscode.Position(0, 0)
			);

			const diagnostic = DiagnosticFactory.createReturnMissingInDocstring(
				'fetch',
				'Response',
				range,
				returnLocation
			);

			assert.ok(diagnostic.relatedInformation);
			assert.strictEqual(diagnostic.relatedInformation.length, 1);
			assert.ok(diagnostic.relatedInformation[0].message.includes('fetch'));
			assert.ok(diagnostic.relatedInformation[0].message.includes('Response'));
		});

	});

	suite('createReturnDocumentedButVoid (DSV203)', () => {

		test('Should create diagnostic with doc type', () => {
			const range = new vscode.Range(7, 0, 7, 40);
			const diagnostic = DiagnosticFactory.createReturnDocumentedButVoid(
				'setup',
				'bool',
				range
			);

			assert.strictEqual(diagnostic.code, DiagnosticCode.RETURN_DOCUMENTED_BUT_VOID);
			assert.ok(diagnostic.message.includes('void'));
			assert.ok(diagnostic.message.includes("('bool')"));
			assert.strictEqual(diagnostic.severity, vscode.DiagnosticSeverity.Warning);
		});

		test('Should create diagnostic without doc type', () => {
			const range = new vscode.Range(7, 0, 7, 40);
			const diagnostic = DiagnosticFactory.createReturnDocumentedButVoid(
				'initialize',
				null,
				range
			);

			assert.strictEqual(diagnostic.code, DiagnosticCode.RETURN_DOCUMENTED_BUT_VOID);
			assert.ok(diagnostic.message.includes('void'));
			assert.ok(!diagnostic.message.includes("('')"));
		});

	});

	suite('createMultipleInconsistentReturns (DSV204)', () => {

		test('Should create diagnostic with multiple types', () => {
			const range = new vscode.Range(8, 0, 8, 50);
			const diagnostic = DiagnosticFactory.createMultipleInconsistentReturns(
				'get_value',
				['int', 'str', 'None'],
				range
			);

			assert.strictEqual(diagnostic.code, DiagnosticCode.RETURN_MULTIPLE_INCONSISTENT);
			assert.ok(diagnostic.message.includes('int'));
			assert.ok(diagnostic.message.includes('str'));
			assert.ok(diagnostic.message.includes('None'));
			assert.strictEqual(diagnostic.severity, vscode.DiagnosticSeverity.Information);
		});

		test('Should deduplicate return types', () => {
			const range = new vscode.Range(8, 0, 8, 50);
			const diagnostic = DiagnosticFactory.createMultipleInconsistentReturns(
				'func',
				['int', 'str', 'int', 'str'],
				range
			);

			// Should contain 'int' and 'str' only once
			const message = diagnostic.message;
			const intMatches = (message.match(/int/g) || []).length;
			const strMatches = (message.match(/str/g) || []).length;

			// Should appear once in the types list (may appear again in surrounding text)
			assert.ok(intMatches <= 2); // Once in list, possibly once in description
			assert.ok(strMatches <= 2);
		});

	});

	suite('createGeneratorShouldYield (DSV205)', () => {

		test('Should create diagnostic', () => {
			const range = new vscode.Range(9, 0, 9, 60);
			const diagnostic = DiagnosticFactory.createGeneratorShouldYield(
				'generate_items',
				range
			);

			assert.strictEqual(diagnostic.code, DiagnosticCode.GENERATOR_SHOULD_YIELD);
			assert.ok(diagnostic.message.includes('Generator'));
			assert.ok(diagnostic.message.includes('Yields'));
			assert.ok(diagnostic.message.includes('Returns'));
			assert.strictEqual(diagnostic.severity, vscode.DiagnosticSeverity.Warning);
		});

	});

	suite('createExceptionNotDocumented (DSV301)', () => {

		test('Should create diagnostic without related info', () => {
			const range = new vscode.Range(10, 0, 10, 40);
			const diagnostic = DiagnosticFactory.createExceptionNotDocumented(
				'ValueError',
				'validate',
				range
			);

			assert.strictEqual(diagnostic.code, DiagnosticCode.EXCEPTION_UNDOCUMENTED);
			assert.ok(diagnostic.message.includes('ValueError'));
			assert.ok(diagnostic.message.includes('not documented'));
			assert.ok(diagnostic.message.includes('Raises'));
			assert.strictEqual(diagnostic.relatedInformation, undefined);
		});

		test('Should include related information when provided', () => {
			const range = new vscode.Range(10, 0, 10, 40);
			const raiseLocation = new vscode.Location(
				vscode.Uri.file('/test/file.py'),
				new vscode.Position(5, 8)
			);

			const diagnostic = DiagnosticFactory.createExceptionNotDocumented(
				'KeyError',
				'get_item',
				range,
				raiseLocation
			);

			assert.ok(diagnostic.relatedInformation);
			assert.strictEqual(diagnostic.relatedInformation.length, 1);
			assert.ok(diagnostic.relatedInformation[0].message.includes('KeyError'));
			assert.ok(diagnostic.relatedInformation[0].message.includes('raised here'));
		});

	});

	suite('createExceptionNotRaised (DSV302)', () => {

		test('Should create diagnostic', () => {
			const range = new vscode.Range(11, 0, 11, 50);
			const diagnostic = DiagnosticFactory.createExceptionNotRaised(
				'IOError',
				'read_file',
				range
			);

			assert.strictEqual(diagnostic.code, DiagnosticCode.EXCEPTION_NOT_RAISED);
			assert.ok(diagnostic.message.includes('IOError'));
			assert.ok(diagnostic.message.includes('documented but not raised'));
			assert.strictEqual(diagnostic.severity, vscode.DiagnosticSeverity.Information);
		});

	});

	suite('createSideEffectUndocumented (DSV401)', () => {

		test('Should create diagnostic with single side effect', () => {
			const range = new vscode.Range(12, 0, 12, 60);
			const diagnostic = DiagnosticFactory.createSideEffectUndocumented(
				'save_config',
				['file I/O'],
				range
			);

			assert.strictEqual(diagnostic.code, DiagnosticCode.SIDE_EFFECT_UNDOCUMENTED);
			assert.ok(diagnostic.message.includes('file I/O'));
			assert.ok(diagnostic.message.includes('side effects'));
			assert.strictEqual(diagnostic.severity, vscode.DiagnosticSeverity.Information);
		});

		test('Should create diagnostic with multiple side effects', () => {
			const range = new vscode.Range(12, 0, 12, 60);
			const diagnostic = DiagnosticFactory.createSideEffectUndocumented(
				'update_state',
				['file I/O', 'global modifications'],
				range
			);

			assert.ok(diagnostic.message.includes('file I/O'));
			assert.ok(diagnostic.message.includes('global modifications'));
			assert.ok(diagnostic.message.includes('and')); // Should join with 'and'
		});

	});

	suite('Common Properties', () => {

		test('All diagnostics should have docstring-verifier source', () => {
			const range = new vscode.Range(0, 0, 0, 10);

			const diagnostics = [
				DiagnosticFactory.createParamMissingInDocstring('p', 'f', range),
				DiagnosticFactory.createParamMissingInCode('p', 'f', range),
				DiagnosticFactory.createParamTypeMismatch('p', 'f', 'int', 'str', range),
				DiagnosticFactory.createParamOptionalMismatch('p', 'f', true, range),
				DiagnosticFactory.createReturnTypeMismatch('f', 'int', 'str', range),
				DiagnosticFactory.createReturnMissingInDocstring('f', 'int', range),
				DiagnosticFactory.createReturnDocumentedButVoid('f', 'int', range),
				DiagnosticFactory.createMultipleInconsistentReturns('f', ['int', 'str'], range),
				DiagnosticFactory.createGeneratorShouldYield('f', range),
				DiagnosticFactory.createExceptionNotDocumented('ValueError', 'f', range),
				DiagnosticFactory.createExceptionNotRaised('ValueError', 'f', range),
				DiagnosticFactory.createSideEffectUndocumented('f', ['file I/O'], range)
			];

			diagnostics.forEach(d => {
				assert.strictEqual(d.source, 'docstring-verifier');
			});
		});

		test('All diagnostics should have proper diagnostic codes', () => {
			const range = new vscode.Range(0, 0, 0, 10);

			const testCases = [
				{ diag: DiagnosticFactory.createParamMissingInDocstring('p', 'f', range), code: DiagnosticCode.PARAM_MISSING_IN_DOCSTRING },
				{ diag: DiagnosticFactory.createParamMissingInCode('p', 'f', range), code: DiagnosticCode.PARAM_MISSING_IN_CODE },
				{ diag: DiagnosticFactory.createParamTypeMismatch('p', 'f', 'int', 'str', range), code: DiagnosticCode.PARAM_TYPE_MISMATCH },
				{ diag: DiagnosticFactory.createParamOptionalMismatch('p', 'f', true, range), code: DiagnosticCode.PARAM_OPTIONAL_MISMATCH },
				{ diag: DiagnosticFactory.createReturnTypeMismatch('f', 'int', 'str', range), code: DiagnosticCode.RETURN_TYPE_MISMATCH },
				{ diag: DiagnosticFactory.createReturnMissingInDocstring('f', 'int', range), code: DiagnosticCode.RETURN_MISSING_IN_DOCSTRING },
				{ diag: DiagnosticFactory.createReturnDocumentedButVoid('f', 'int', range), code: DiagnosticCode.RETURN_DOCUMENTED_BUT_VOID },
				{ diag: DiagnosticFactory.createMultipleInconsistentReturns('f', ['int'], range), code: DiagnosticCode.RETURN_MULTIPLE_INCONSISTENT },
				{ diag: DiagnosticFactory.createGeneratorShouldYield('f', range), code: DiagnosticCode.GENERATOR_SHOULD_YIELD },
				{ diag: DiagnosticFactory.createExceptionNotDocumented('ValueError', 'f', range), code: DiagnosticCode.EXCEPTION_UNDOCUMENTED },
				{ diag: DiagnosticFactory.createExceptionNotRaised('ValueError', 'f', range), code: DiagnosticCode.EXCEPTION_NOT_RAISED },
				{ diag: DiagnosticFactory.createSideEffectUndocumented('f', ['io'], range), code: DiagnosticCode.SIDE_EFFECT_UNDOCUMENTED }
			];

			testCases.forEach(tc => {
				assert.strictEqual(tc.diag.code, tc.code);
			});
		});

		test('All diagnostics should use provided range', () => {
			const range = new vscode.Range(5, 10, 7, 20);

			const diagnostic = DiagnosticFactory.createParamMissingInDocstring('test', 'func', range);

			assert.strictEqual(diagnostic.range.start.line, 5);
			assert.strictEqual(diagnostic.range.start.character, 10);
			assert.strictEqual(diagnostic.range.end.line, 7);
			assert.strictEqual(diagnostic.range.end.character, 20);
		});

	});

});
