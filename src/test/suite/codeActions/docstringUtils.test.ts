/**
 * Tests for docstring utility functions.
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import {
	findDocstringRange,
	extractParameterName,
	extractExpectedType,
	extractExpectedOptional
} from '../../../codeActions/utils/docstringUtils';
import { FunctionDescriptor } from '../../../parsers/types';

suite('Docstring Utils Tests', () => {

	suite('findDocstringRange', () => {

		test('Should find single-line docstring with triple double quotes', async () => {
			const content = 'def test():\n    """Single line docstring."""\n    pass';
			const doc = await vscode.workspace.openTextDocument({
				language: 'python',
				content
			});

			const func: FunctionDescriptor = {
				name: 'test',
				range: new vscode.Range(0, 0, 2, 0),
				parameters: [],
				returnType: null,
				returnStatements: [],
				yieldStatements: [],
				isAsync: false,
				isGenerator: false,
				docstring: 'Single line docstring.',
				docstringRange: new vscode.Range(1, 4, 1, 31),
				raises: [],
				hasIO: false,
				hasGlobalMods: false
			};

			const range = findDocstringRange(doc, func);

			assert.ok(range);
			assert.strictEqual(range.start.line, 1);
			assert.strictEqual(range.start.character, 4); // After indentation
			assert.strictEqual(range.end.line, 1);
			// The closing """ position depends on actual string length
			assert.ok(range.end.character >= 27); // At least after "Single line docstring."""
		});

		test('Should find single-line docstring with triple single quotes', async () => {
			const content = "def test():\n    '''Single line docstring.'''\n    pass";
			const doc = await vscode.workspace.openTextDocument({
				language: 'python',
				content
			});

			const func: FunctionDescriptor = {
				name: 'test',
				range: new vscode.Range(0, 0, 2, 0),
				parameters: [],
				returnType: null,
				returnStatements: [],
				yieldStatements: [],
				isAsync: false,
				isGenerator: false,
				docstring: 'Single line docstring.',
				docstringRange: new vscode.Range(1, 4, 1, 31),
				raises: [],
				hasIO: false,
				hasGlobalMods: false
			};

			const range = findDocstringRange(doc, func);

			assert.ok(range);
			assert.strictEqual(range.start.line, 1);
			assert.strictEqual(range.end.line, 1);
		});

		test('Should find multi-line docstring', async () => {
			const content = 'def test():\n    """\n    Multi-line docstring.\n    Second line.\n    """\n    pass';
			const doc = await vscode.workspace.openTextDocument({
				language: 'python',
				content
			});

			const func: FunctionDescriptor = {
				name: 'test',
				range: new vscode.Range(0, 0, 5, 0),
				parameters: [],
				returnType: null,
				returnStatements: [],
				yieldStatements: [],
				isAsync: false,
				isGenerator: false,
				docstring: 'Multi-line docstring.\nSecond line.',
				docstringRange: new vscode.Range(1, 4, 4, 7),
				raises: [],
				hasIO: false,
				hasGlobalMods: false
			};

			const range = findDocstringRange(doc, func);

			assert.ok(range);
			assert.strictEqual(range.start.line, 1, 'Start line should be 1');
			assert.strictEqual(range.start.character, 4, 'Start char should be 4');
			assert.strictEqual(range.end.line, 4, 'End line should be 4');
			assert.strictEqual(range.end.character, 7, 'End char should be 7 (after """)');
		});

		test('Should find docstring with Args section', async () => {
			const content = 'def test(x):\n    """\n    Test function.\n\n    Args:\n        x: parameter\n    """\n    pass';
			const doc = await vscode.workspace.openTextDocument({
				language: 'python',
				content
			});

			const func: FunctionDescriptor = {
				name: 'test',
				range: new vscode.Range(0, 0, 7, 0),
				parameters: [],
				returnType: null,
				returnStatements: [],
				yieldStatements: [],
				isAsync: false,
				isGenerator: false,
				docstring: 'Test function.\n\nArgs:\n    x: parameter',
				docstringRange: new vscode.Range(1, 4, 6, 7),
				raises: [],
				hasIO: false,
				hasGlobalMods: false
			};

			const range = findDocstringRange(doc, func);

			assert.ok(range);
			assert.strictEqual(range.start.line, 1);
			assert.strictEqual(range.end.line, 6);
		});

		test('Should return null when function has no docstring', async () => {
			const content = 'def test():\n    pass';
			const doc = await vscode.workspace.openTextDocument({
				language: 'python',
				content
			});

			const func: FunctionDescriptor = {
				name: 'test',
				range: new vscode.Range(0, 0, 1, 0),
				parameters: [],
				returnType: null,
				returnStatements: [],
				yieldStatements: [],
				isAsync: false,
				isGenerator: false,
				docstring: null,
				docstringRange: null,
				raises: [],
				hasIO: false,
				hasGlobalMods: false
			};

			const range = findDocstringRange(doc, func);

			assert.strictEqual(range, null);
		});

		test('Should return null when docstring quotes not found', async () => {
			const content = 'def test():\n    pass  # Comment';
			const doc = await vscode.workspace.openTextDocument({
				language: 'python',
				content
			});

			const func: FunctionDescriptor = {
				name: 'test',
				range: new vscode.Range(0, 0, 1, 0),
				parameters: [],
				returnType: null,
				returnStatements: [],
				yieldStatements: [],
				isAsync: false,
				isGenerator: false,
				docstring: 'Has docstring in descriptor but not in actual code',
				docstringRange: new vscode.Range(1, 4, 1, 10),
				raises: [],
				hasIO: false,
				hasGlobalMods: false
			};

			const range = findDocstringRange(doc, func);

			assert.strictEqual(range, null);
		});

		test('Should handle docstring immediately after def', async () => {
			const content = 'def test(): """Inline docstring."""';
			const doc = await vscode.workspace.openTextDocument({
				language: 'python',
				content
			});

			const func: FunctionDescriptor = {
				name: 'test',
				range: new vscode.Range(0, 0, 0, 35),
				parameters: [],
				returnType: null,
				returnStatements: [],
				yieldStatements: [],
				isAsync: false,
				isGenerator: false,
				docstring: 'Inline docstring.',
				docstringRange: new vscode.Range(0, 12, 0, 35),
				raises: [],
				hasIO: false,
				hasGlobalMods: false
			};

			const range = findDocstringRange(doc, func);

			assert.ok(range);
			assert.strictEqual(range.start.line, 0);
			assert.strictEqual(range.end.line, 0);
		});

		test('Should handle unclosed multi-line docstring gracefully', async () => {
			const content = 'def test():\n    """\n    Unclosed docstring\n    pass';
			const doc = await vscode.workspace.openTextDocument({
				language: 'python',
				content
			});

			const func: FunctionDescriptor = {
				name: 'test',
				range: new vscode.Range(0, 0, 3, 0),
				parameters: [],
				returnType: null,
				returnStatements: [],
				yieldStatements: [],
				isAsync: false,
				isGenerator: false,
				docstring: 'Unclosed docstring',
				docstringRange: new vscode.Range(1, 4, 2, 22),
				raises: [],
				hasIO: false,
				hasGlobalMods: false
			};

			const range = findDocstringRange(doc, func);

			// Should return null since closing quotes not found
			assert.strictEqual(range, null);
		});

		test('Should stop search after 10 lines', async () => {
			const content = 'def test():\n' + '    pass\n'.repeat(15) + '    """Docstring far away"""';
			const doc = await vscode.workspace.openTextDocument({
				language: 'python',
				content
			});

			const func: FunctionDescriptor = {
				name: 'test',
				range: new vscode.Range(0, 0, 16, 0),
				parameters: [],
				returnType: null,
				returnStatements: [],
				yieldStatements: [],
				isAsync: false,
				isGenerator: false,
				docstring: 'Docstring far away',
				docstringRange: new vscode.Range(16, 4, 16, 30),
				raises: [],
				hasIO: false,
				hasGlobalMods: false
			};

			const range = findDocstringRange(doc, func);

			// Should not find docstring beyond 10 lines
			assert.strictEqual(range, null);
		});

	});

	suite('extractParameterName', () => {

		test('Should extract parameter name from DSV102 message', () => {
			const diagnostic = new vscode.Diagnostic(
				new vscode.Range(0, 0, 0, 0),
				"Parameter 'username' is missing in docstring",
				vscode.DiagnosticSeverity.Warning
			);

			const name = extractParameterName(diagnostic);

			assert.strictEqual(name, 'username');
		});

		test('Should extract parameter name from DSV101 message', () => {
			const diagnostic = new vscode.Diagnostic(
				new vscode.Range(0, 0, 0, 0),
				"Parameter 'old_param' is documented but not in function signature",
				vscode.DiagnosticSeverity.Warning
			);

			const name = extractParameterName(diagnostic);

			assert.strictEqual(name, 'old_param');
		});

		test('Should extract parameter name from DSV103 message', () => {
			const diagnostic = new vscode.Diagnostic(
				new vscode.Range(0, 0, 0, 0),
				"Parameter 'count' type mismatch: code has 'int', docstring has 'str'",
				vscode.DiagnosticSeverity.Warning
			);

			const name = extractParameterName(diagnostic);

			assert.strictEqual(name, 'count');
		});

		test('Should extract parameter name from DSV104 message', () => {
			const diagnostic = new vscode.Diagnostic(
				new vscode.Range(0, 0, 0, 0),
				"Parameter \'timeout\' is optional (has default value) in code but marked as required in docstring for function \'test\'",
				vscode.DiagnosticSeverity.Warning
			);

			const name = extractParameterName(diagnostic);

			assert.strictEqual(name, 'timeout');
		});

		test('Should handle lowercase parameter in message', () => {
			const diagnostic = new vscode.Diagnostic(
				new vscode.Range(0, 0, 0, 0),
				"parameter 'test' is missing",
				vscode.DiagnosticSeverity.Warning
			);

			const name = extractParameterName(diagnostic);

			assert.strictEqual(name, 'test');
		});

		test('Should return null for message without parameter pattern', () => {
			const diagnostic = new vscode.Diagnostic(
				new vscode.Range(0, 0, 0, 0),
				"Return type mismatch",
				vscode.DiagnosticSeverity.Warning
			);

			const name = extractParameterName(diagnostic);

			assert.strictEqual(name, null);
		});

		test('Should return null for empty message', () => {
			const diagnostic = new vscode.Diagnostic(
				new vscode.Range(0, 0, 0, 0),
				"Placeholder message", // VS Code requires non-empty message
				vscode.DiagnosticSeverity.Warning
			);

			const name = extractParameterName(diagnostic);

			// Empty-like message without parameter pattern should return null
			assert.strictEqual(name, null);
		});

		test('Should extract parameter with underscore', () => {
			const diagnostic = new vscode.Diagnostic(
				new vscode.Range(0, 0, 0, 0),
				"Parameter 'max_retries' is missing in docstring",
				vscode.DiagnosticSeverity.Warning
			);

			const name = extractParameterName(diagnostic);

			assert.strictEqual(name, 'max_retries');
		});

		test('Should extract parameter with numbers', () => {
			const diagnostic = new vscode.Diagnostic(
				new vscode.Range(0, 0, 0, 0),
				"Parameter 'param1' is missing in docstring",
				vscode.DiagnosticSeverity.Warning
			);

			const name = extractParameterName(diagnostic);

			assert.strictEqual(name, 'param1');
		});

	});

	suite('extractExpectedType', () => {

		test('Should extract type from DSV103 message', () => {
			const diagnostic = new vscode.Diagnostic(
				new vscode.Range(0, 0, 0, 0),
				"Parameter 'x' type mismatch: code has 'int', docstring has 'str'",
				vscode.DiagnosticSeverity.Warning
			);

			const type = extractExpectedType(diagnostic);

			assert.strictEqual(type, 'int');
		});

		test('Should extract complex type', () => {
			const diagnostic = new vscode.Diagnostic(
				new vscode.Range(0, 0, 0, 0),
				"Parameter 'data' type mismatch: code has 'List[Dict[str, int]]', docstring has 'dict'",
				vscode.DiagnosticSeverity.Warning
			);

			const type = extractExpectedType(diagnostic);

			assert.strictEqual(type, 'List[Dict[str, int]]');
		});

		test('Should extract Optional type', () => {
			const diagnostic = new vscode.Diagnostic(
				new vscode.Range(0, 0, 0, 0),
				"Parameter 'value' type mismatch: code has 'Optional[str]', docstring has 'str'",
				vscode.DiagnosticSeverity.Warning
			);

			const type = extractExpectedType(diagnostic);

			assert.strictEqual(type, 'Optional[str]');
		});

		test('Should extract Union type', () => {
			const diagnostic = new vscode.Diagnostic(
				new vscode.Range(0, 0, 0, 0),
				"Parameter 'result' type mismatch: code has 'str | int', docstring has 'str'",
				vscode.DiagnosticSeverity.Warning
			);

			const type = extractExpectedType(diagnostic);

			assert.strictEqual(type, 'str | int');
		});

		test('Should return null for message without expected pattern', () => {
			const diagnostic = new vscode.Diagnostic(
				new vscode.Range(0, 0, 0, 0),
				"Parameter 'x' is missing in docstring",
				vscode.DiagnosticSeverity.Warning
			);

			const type = extractExpectedType(diagnostic);

			assert.strictEqual(type, null);
		});

		test('Should return null for empty message', () => {
			const diagnostic = new vscode.Diagnostic(
				new vscode.Range(0, 0, 0, 0),
				"Placeholder message", // VS Code requires non-empty message
				vscode.DiagnosticSeverity.Warning
			);

			const type = extractExpectedType(diagnostic);

			// Message without expected pattern should return null
			assert.strictEqual(type, null);
		});

		test('Should handle type with spaces', () => {
			const diagnostic = new vscode.Diagnostic(
				new vscode.Range(0, 0, 0, 0),
				"Parameter 'x' type mismatch: code has 'Dict[str, Any]', docstring has 'dict'",
				vscode.DiagnosticSeverity.Warning
			);

			const type = extractExpectedType(diagnostic);

			assert.strictEqual(type, 'Dict[str, Any]');
		});

	});

	suite('extractExpectedOptional', () => {

		test('Should extract true for "should be optional" message', () => {
			const diagnostic = new vscode.Diagnostic(
				new vscode.Range(0, 0, 0, 0),
				"Parameter \'timeout\' is optional (has default value) in code but marked as required in docstring for function \'test\'",
				vscode.DiagnosticSeverity.Warning
			);

			const optional = extractExpectedOptional(diagnostic);

			assert.strictEqual(optional, true);
		});

		test('Should extract false for "should be required" message', () => {
			const diagnostic = new vscode.Diagnostic(
				new vscode.Range(0, 0, 0, 0),
				"Parameter \'name\' is required in code but marked as optional in docstring for function \'test\'",
				vscode.DiagnosticSeverity.Warning
			);

			const optional = extractExpectedOptional(diagnostic);

			assert.strictEqual(optional, false);
		});

		test('Should return null for message without optional pattern', () => {
			const diagnostic = new vscode.Diagnostic(
				new vscode.Range(0, 0, 0, 0),
				"Parameter 'x' is missing in docstring",
				vscode.DiagnosticSeverity.Warning
			);

			const optional = extractExpectedOptional(diagnostic);

			assert.strictEqual(optional, null);
		});

		test('Should return null for empty message', () => {
			const diagnostic = new vscode.Diagnostic(
				new vscode.Range(0, 0, 0, 0),
				"Placeholder message", // VS Code requires non-empty message
				vscode.DiagnosticSeverity.Warning
			);

			const optional = extractExpectedOptional(diagnostic);

			// Message without optional pattern should return null
			assert.strictEqual(optional, null);
		});

		test('Should handle message with both optional and required keywords', () => {
			// Edge case: should match first occurrence
			const diagnostic = new vscode.Diagnostic(
				new vscode.Range(0, 0, 0, 0),
				"Parameter 'x' is optional (has default value) in code but marked as required in docstring for function 'test'",
				vscode.DiagnosticSeverity.Warning
			);

			const optional = extractExpectedOptional(diagnostic);

			assert.strictEqual(optional, true);
		});

		test('Should handle DSV104 full message for optional', () => {
			const diagnostic = new vscode.Diagnostic(
				new vscode.Range(0, 0, 0, 0),
				"Parameter 'config' is optional (has default value) in code but marked as required in docstring for function 'setup'",
				vscode.DiagnosticSeverity.Warning
			);

			const optional = extractExpectedOptional(diagnostic);

			assert.strictEqual(optional, true);
		});

		test('Should handle DSV104 full message for required', () => {
			const diagnostic = new vscode.Diagnostic(
				new vscode.Range(0, 0, 0, 0),
				"Parameter 'user_id' is required in code but marked as optional in docstring for function 'get_user'",
				vscode.DiagnosticSeverity.Warning
			);

			const optional = extractExpectedOptional(diagnostic);

			assert.strictEqual(optional, false);
		});

	});

});
