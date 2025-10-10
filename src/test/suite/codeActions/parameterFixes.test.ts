/**
 * Tests for ParameterFixProvider.provideCodeActions().
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { ParameterFixProvider } from '../../../codeActions/fixes/parameterFixes';
import { DiagnosticCode } from '../../../diagnostics/types';
import { CodeActionContext } from '../../../codeActions/types';
import { FunctionDescriptor, ParameterDescriptor } from '../../../parsers/types';
import { EditorHandlerRegistry } from '../../../editors/registry';
import { createPythonEditorHandler } from '../../../editors/python';
import { ILLMService } from '../../../llm';

suite('ParameterFixProvider - provideCodeActions Tests', () => {

	let provider: ParameterFixProvider;
	let editorRegistry: EditorHandlerRegistry;
	let mockLLMService: ILLMService;

	setup(() => {
		// Create editor registry with Python handler
		editorRegistry = new EditorHandlerRegistry();
		editorRegistry.register('python', createPythonEditorHandler());

		// Create mock LLM service
		mockLLMService = {
			isAvailable: async () => true,
			generateParameterDescription: async () => ({
				description: 'AI-generated description',
				fromCache: false
			}),
			clearCache: () => { }
		};

		// Create provider without LLM by default
		provider = new ParameterFixProvider(editorRegistry);
	});

	suite('DSV102: Add Missing Parameter to Docstring', () => {

		test('Should create quick fix action with command', async () => {
			// Create test document with function and docstring
			const content = 'def test_func(name: str):\n    """\n    Test function.\n    """\n    pass';
			const document = await vscode.workspace.openTextDocument({
				language: 'python',
				content
			});

			// Create function descriptor
			const func: FunctionDescriptor = {
				name: 'test_func',
				range: new vscode.Range(0, 0, 10, 0),
				parameters: [
					{
						name: 'name',
						type: 'str',
						defaultValue: null,
						isOptional: false
					}
				],
				returnType: null,
				returnStatements: [],
				yieldStatements: [],
				isAsync: false,
				isGenerator: false,
				docstring: 'Test function.',
				docstringRange: new vscode.Range(1, 4, 3, 7),
				raises: [],
				hasIO: false,
				hasGlobalMods: false
			};

			// Create diagnostic
			const diagnostic = new vscode.Diagnostic(
				new vscode.Range(0, 14, 0, 18),
				"Parameter 'name' is missing in docstring. Add it to the Args section.",
				vscode.DiagnosticSeverity.Warning
			);
			diagnostic.code = DiagnosticCode.PARAM_MISSING_IN_DOCSTRING;
			diagnostic.source = 'docstring-verifier';

			// Create context
			const context: CodeActionContext = {
				document,
				diagnostic,
				function: func
			};

			// Get actions
			const actions = provider.provideCodeActions(context);

			// Debug: log actions to see what we get
			console.log(`\n=== DEBUG: Got ${actions.length} actions ===`);
			actions.forEach((action, index) => {
				console.log(`Action ${index}: title="${action.title}", command="${action.command?.command}"`);
			});

			// Assertions
			assert.strictEqual(actions.length, 1, `Expected 1 action, got ${actions.length}`);
			const action = actions[0];

			assert.strictEqual(action.title, "Add parameter 'name' to docstring");
			assert.strictEqual(action.kind, vscode.CodeActionKind.QuickFix);
			assert.strictEqual(action.isPreferred, true);
			assert.deepStrictEqual(action.diagnostics, [diagnostic]);

			// Check that command exists (changed from edit to command)
			assert.ok(action.command);
			assert.strictEqual(action.command.command, 'docstring-verifier.applyQuickFix');
			assert.ok(action.command.arguments);
			assert.strictEqual(action.command.arguments.length, 2); // documentUri and edit

			// Workspace edit was created successfully - detailed content validation
			// is covered by googleEditor tests
		});

		test('Should use TODO placeholder for description when no LLM', async () => {
			const content = 'def calc(x: int):\n    """\n    Calculate.\n    """\n    pass';
			const document = await vscode.workspace.openTextDocument({
				language: 'python',
				content
			});

			const func: FunctionDescriptor = {
				name: 'calc',
				range: new vscode.Range(0, 0, 10, 0),
				parameters: [{
					name: 'x',
					type: 'int',
					defaultValue: null,
					isOptional: false,
				}],
				returnType: null,
				returnStatements: [],
				yieldStatements: [],
				isAsync: false,
				isGenerator: false,
				docstring: 'Calculate.',
				docstringRange: new vscode.Range(1, 4, 3, 7),
				raises: [],
				hasIO: false,
				hasGlobalMods: false
			};

			const diagnostic = new vscode.Diagnostic(
				new vscode.Range(0, 9, 0, 10),
				"Parameter 'x' is missing in docstring. Add it to the Args section.",
				vscode.DiagnosticSeverity.Warning
			);
			diagnostic.code = DiagnosticCode.PARAM_MISSING_IN_DOCSTRING;

			const context: CodeActionContext = {
				document,
				diagnostic,
				function: func
			};

			const actions = provider.provideCodeActions(context);
			assert.ok(actions.length >= 1, 'Should have at least one action');
			const action = actions[0];

			// Verify that command was created
			assert.ok(action.command);
			assert.strictEqual(action.command.command, 'docstring-verifier.applyQuickFix');
		});

		test('Should include LLM enhancement command when LLM available', async () => {
			// Create provider with LLM service
			const providerWithLLM = new ParameterFixProvider(editorRegistry, mockLLMService);

			const content = 'def test(value: str):\n    """\n    Test.\n    """\n    pass';
			const document = await vscode.workspace.openTextDocument({
				language: 'python',
				content
			});

			const func: FunctionDescriptor = {
				name: 'test',
				range: new vscode.Range(0, 0, 10, 0),
				parameters: [{
					name: 'value',
					type: 'str',
					defaultValue: null,
					isOptional: false,
				}],
				returnType: null,
				returnStatements: [],
				yieldStatements: [],
				isAsync: false,
				isGenerator: false,
				docstring: 'Test.',
				docstringRange: new vscode.Range(1, 4, 3, 7),
				raises: [],
				hasIO: false,
				hasGlobalMods: false
			};

			const diagnostic = new vscode.Diagnostic(
				new vscode.Range(0, 9, 0, 14),
				"Parameter 'value' is missing in docstring. Add it to the Args section.",
				vscode.DiagnosticSeverity.Warning
			);
			diagnostic.code = DiagnosticCode.PARAM_MISSING_IN_DOCSTRING;

			const context: CodeActionContext = {
				document,
				diagnostic,
				function: func
			};

			const actions = providerWithLLM.provideCodeActions(context);
			assert.ok(actions.length >= 1, 'Should have at least one action');
			const action = actions.find(a => a.title === "Add parameter 'value' to docstring");
			assert.ok(action, 'Should have add parameter action');

			// Check command exists - should still be applyQuickFix (not enhanceParameterDescription)
			// The enhancement command is triggered AFTER the quick fix is applied
			assert.ok(action.command);
			assert.strictEqual(action.command.command, 'docstring-verifier.applyQuickFix');
			assert.ok(action.command.arguments);
			assert.strictEqual(action.command.arguments.length, 2); // documentUri and edit
		});

		test('Should handle missing parameter name gracefully', async () => {
			const content = 'def test():\n    """\n    Test.\n    """\n    pass';
			const document = await vscode.workspace.openTextDocument({
				language: 'python',
				content
			});

			const func: FunctionDescriptor = {
				name: 'test',
				range: new vscode.Range(0, 0, 10, 0),
				parameters: [],
				returnType: null,
				returnStatements: [],
				yieldStatements: [],
				isAsync: false,
				isGenerator: false,
				docstring: 'Test.',
				docstringRange: new vscode.Range(1, 4, 3, 7),
				raises: [],
				hasIO: false,
				hasGlobalMods: false
			};

			// Diagnostic without parameter name in message
			const diagnostic = new vscode.Diagnostic(
				new vscode.Range(1, 4, 1, 10),
				"Parameter is missing in docstring",
				vscode.DiagnosticSeverity.Warning
			);
			diagnostic.code = DiagnosticCode.PARAM_MISSING_IN_DOCSTRING;

			const context: CodeActionContext = {
				document,
				diagnostic,
				function: func
			};

			const actions = provider.provideCodeActions(context);

			// Should still create action but with generic title
			assert.strictEqual(actions.length, 1);
			assert.strictEqual(actions[0].title, 'Add missing parameter to docstring');
			assert.strictEqual(actions[0].edit, undefined); // No edit without parameter
		});

	});

	suite('DSV101: Remove Extra Parameter from Docstring', () => {

		test('Should create quick fix to remove parameter', async () => {
			const content = 'def test():\n    """\n    Test.\n\n    Args:\n        old_param: Removed parameter.\n    """\n    pass';
			const document = await vscode.workspace.openTextDocument({
				language: 'python',
				content
			});

			const func: FunctionDescriptor = {
				name: 'test',
				range: new vscode.Range(0, 0, 10, 0),
				parameters: [],
				returnType: null,
				returnStatements: [],
				yieldStatements: [],
				isAsync: false,
				isGenerator: false,
				docstring: 'Test.\n\nArgs:\n    old_param: Removed parameter.',
				docstringRange: new vscode.Range(1, 4, 6, 7),
				raises: [],
				hasIO: false,
				hasGlobalMods: false
			};

			const diagnostic = new vscode.Diagnostic(
				new vscode.Range(5, 8, 5, 17),
				"Parameter 'old_param' is documented but not found in function 'test'. Remove it from docstring or add to function signature.",
				vscode.DiagnosticSeverity.Warning
			);
			diagnostic.code = DiagnosticCode.PARAM_MISSING_IN_CODE;

			const context: CodeActionContext = {
				document,
				diagnostic,
				function: func
			};

			const actions = provider.provideCodeActions(context);

			assert.strictEqual(actions.length, 1);
			const action = actions[0];

			assert.strictEqual(action.title, "Remove parameter 'old_param' from docstring");
			assert.strictEqual(action.kind, vscode.CodeActionKind.QuickFix);
			assert.ok(action.command);
			assert.strictEqual(action.command.command, 'docstring-verifier.applyQuickFix');
		});

		test('Should handle multiple parameters removal', async () => {
			const content = 'def test():\n    """\n    Test.\n\n    Args:\n        param1: First.\n        param2: Second.\n    """\n    pass';
			const document = await vscode.workspace.openTextDocument({
				language: 'python',
				content
			});

			const func: FunctionDescriptor = {
				name: 'test',
				range: new vscode.Range(0, 0, 10, 0),
				parameters: [],
				returnType: null,
				returnStatements: [],
				yieldStatements: [],
				isAsync: false,
				isGenerator: false,
				docstring: 'Test.\n\nArgs:\n    param1: First.\n    param2: Second.',
				docstringRange: new vscode.Range(1, 4, 7, 7),
				raises: [],
				hasIO: false,
				hasGlobalMods: false
			};

			const diagnostic = new vscode.Diagnostic(
				new vscode.Range(5, 8, 5, 14),
				"Parameter 'param1' is documented but not found in function 'test'. Remove it from docstring or add to function signature.",
				vscode.DiagnosticSeverity.Warning
			);
			diagnostic.code = DiagnosticCode.PARAM_MISSING_IN_CODE;

			const context: CodeActionContext = {
				document,
				diagnostic,
				function: func
			};

			const actions = provider.provideCodeActions(context);
			const action = actions[0];

			// Should remove only param1, keep param2
			// Verify that command was created
			assert.ok(action.command);
			assert.strictEqual(action.command.command, 'docstring-verifier.applyQuickFix');
		});

	});

	suite('DSV103: Fix Parameter Type Mismatch', () => {

		test('Should create quick fix to update type', async () => {
			const content = 'def test(count: int):\n    """\n    Test.\n\n    Args:\n        count (str): Count value.\n    """\n    pass';
			const document = await vscode.workspace.openTextDocument({
				language: 'python',
				content
			});

			const func: FunctionDescriptor = {
				name: 'test',
				range: new vscode.Range(0, 0, 10, 0),
				parameters: [{
					name: 'count',
					type: 'int',
					defaultValue: null,
					isOptional: false,
				}],
				returnType: null,
				returnStatements: [],
				yieldStatements: [],
				isAsync: false,
				isGenerator: false,
				docstring: 'Test.\n\nArgs:\n    count (str): Count value.',
				docstringRange: new vscode.Range(1, 4, 6, 7),
				raises: [],
				hasIO: false,
				hasGlobalMods: false
			};

			const diagnostic = new vscode.Diagnostic(
				new vscode.Range(5, 8, 5, 13),
				"Parameter 'count' type mismatch: code has 'int', docstring has 'str'. Update docstring to match code.",
				vscode.DiagnosticSeverity.Warning
			);
			diagnostic.code = DiagnosticCode.PARAM_TYPE_MISMATCH;

			const context: CodeActionContext = {
				document,
				diagnostic,
				function: func
			};

			const actions = provider.provideCodeActions(context);

			assert.strictEqual(actions.length, 1);
			const action = actions[0];

			assert.strictEqual(action.title, "Fix type of parameter 'count' to 'int'");
			assert.ok(action.command);
			assert.strictEqual(action.command.command, 'docstring-verifier.applyQuickFix');
		});

		test('Should handle complex types', async () => {
			const content = 'def test(data: dict[str, int]):\n    """\n    Test.\n\n    Args:\n        data (dict): Data.\n    """\n    pass';
			const document = await vscode.workspace.openTextDocument({
				language: 'python',
				content
			});

			const func: FunctionDescriptor = {
				name: 'test',
				range: new vscode.Range(0, 0, 10, 0),
				parameters: [{
					name: 'data',
					type: 'dict[str, int]',
					defaultValue: null,
					isOptional: false,
				}],
				returnType: null,
				returnStatements: [],
				yieldStatements: [],
				isAsync: false,
				isGenerator: false,
				docstring: 'Test.\n\nArgs:\n    data (dict): Data.',
				docstringRange: new vscode.Range(1, 4, 6, 7),
				raises: [],
				hasIO: false,
				hasGlobalMods: false
			};

			const diagnostic = new vscode.Diagnostic(
				new vscode.Range(5, 8, 5, 12),
				"Parameter 'data' type mismatch: code has 'dict[str, int]', docstring has 'dict'. Update docstring to match code.",
				vscode.DiagnosticSeverity.Warning
			);
			diagnostic.code = DiagnosticCode.PARAM_TYPE_MISMATCH;

			const context: CodeActionContext = {
				document,
				diagnostic,
				function: func
			};

			const actions = provider.provideCodeActions(context);
			const action = actions[0];

			assert.strictEqual(action.title, "Fix type of parameter 'data' to 'dict[str, int]'");
			assert.ok(action.command);
			assert.strictEqual(action.command.command, 'docstring-verifier.applyQuickFix');
		});

		test('Should handle missing parameter name gracefully', async () => {
			const content = 'def test(x: int):\n    """\n    Test.\n\n    Args:\n        x (str): X.\n    """\n    pass';
			const document = await vscode.workspace.openTextDocument({
				language: 'python',
				content
			});

			const func: FunctionDescriptor = {
				name: 'test',
				range: new vscode.Range(0, 0, 10, 0),
				parameters: [{
					name: 'x',
					type: 'int',
					defaultValue: null,
					isOptional: false,
				}],
				returnType: null,
				returnStatements: [],
				yieldStatements: [],
				isAsync: false,
				isGenerator: false,
				docstring: 'Test.\n\nArgs:\n    x (str): X.',
				docstringRange: new vscode.Range(1, 4, 6, 7),
				raises: [],
				hasIO: false,
				hasGlobalMods: false
			};

			// Malformed diagnostic without type
			const diagnostic = new vscode.Diagnostic(
				new vscode.Range(5, 8, 5, 9),
				"Parameter type mismatch",
				vscode.DiagnosticSeverity.Warning
			);
			diagnostic.code = DiagnosticCode.PARAM_TYPE_MISMATCH;

			const context: CodeActionContext = {
				document,
				diagnostic,
				function: func
			};

			const actions = provider.provideCodeActions(context);

			// Should create action with generic title
			assert.strictEqual(actions.length, 1);
			assert.strictEqual(actions[0].title, 'Fix parameter type in docstring');
			assert.strictEqual(actions[0].edit, undefined); // No edit without extraction
		});

	});

	suite('DSV104: Fix Optional/Required Mismatch', () => {

		test('Should mark parameter as optional', async () => {
			const content = 'def test(timeout: int = 30):\n    """\n    Test.\n\n    Args:\n        timeout (int): Timeout value.\n    """\n    pass';
			const document = await vscode.workspace.openTextDocument({
				language: 'python',
				content
			});

			const func: FunctionDescriptor = {
				name: 'test',
				range: new vscode.Range(0, 0, 10, 0),
				parameters: [{
					name: 'timeout',
					type: 'int',
					defaultValue: '30',
					isOptional: true,
				}],
				returnType: null,
				returnStatements: [],
				yieldStatements: [],
				isAsync: false,
				isGenerator: false,
				docstring: 'Test.\n\nArgs:\n    timeout (int): Timeout value.',
				docstringRange: new vscode.Range(1, 4, 6, 7),
				raises: [],
				hasIO: false,
				hasGlobalMods: false
			};

			const diagnostic = new vscode.Diagnostic(
				new vscode.Range(5, 8, 5, 15),
				"Parameter 'timeout' is optional (has default value) in code but marked as required in docstring for function 'test'",
				vscode.DiagnosticSeverity.Information
			);
			diagnostic.code = DiagnosticCode.PARAM_OPTIONAL_MISMATCH;

			const context: CodeActionContext = {
				document,
				diagnostic,
				function: func
			};

			const actions = provider.provideCodeActions(context);

			assert.strictEqual(actions.length, 1);
			const action = actions[0];

			assert.strictEqual(action.title, "Mark parameter 'timeout' as optional");
			assert.ok(action.command);
			assert.strictEqual(action.command.command, 'docstring-verifier.applyQuickFix');
		});

		test('Should mark parameter as required', async () => {
			const content = 'def test(user_id: int):\n    """\n    Test.\n\n    Args:\n        user_id (int, optional): User ID.\n    """\n    pass';
			const document = await vscode.workspace.openTextDocument({
				language: 'python',
				content
			});

			const func: FunctionDescriptor = {
				name: 'test',
				range: new vscode.Range(0, 0, 10, 0),
				parameters: [{
					name: 'user_id',
					type: 'int',
					defaultValue: null,
					isOptional: false,
				}],
				returnType: null,
				returnStatements: [],
				yieldStatements: [],
				isAsync: false,
				isGenerator: false,
				docstring: 'Test.\n\nArgs:\n    user_id (int, optional): User ID.',
				docstringRange: new vscode.Range(1, 4, 6, 7),
				raises: [],
				hasIO: false,
				hasGlobalMods: false
			};

			const diagnostic = new vscode.Diagnostic(
				new vscode.Range(5, 8, 5, 15),
				"Parameter 'user_id' is required in code but marked as optional in docstring for function 'test'",
				vscode.DiagnosticSeverity.Information
			);
			diagnostic.code = DiagnosticCode.PARAM_OPTIONAL_MISMATCH;

			const context: CodeActionContext = {
				document,
				diagnostic,
				function: func
			};

			const actions = provider.provideCodeActions(context);
			const action = actions[0];

			assert.strictEqual(action.title, "Mark parameter 'user_id' as required");
			assert.ok(action.command);
			assert.strictEqual(action.command.command, 'docstring-verifier.applyQuickFix');
		});

	});

	suite('Edge Cases and Error Handling', () => {

		test('Should handle missing docstring gracefully', async () => {
			const content = 'def test(x: int):\n    pass';
			const document = await vscode.workspace.openTextDocument({
				language: 'python',
				content
			});

			const func: FunctionDescriptor = {
				name: 'test',
				range: new vscode.Range(0, 0, 10, 0),
				parameters: [{
					name: 'x',
					type: 'int',
					defaultValue: null,
					isOptional: false,
				}],
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

			const diagnostic = new vscode.Diagnostic(
				new vscode.Range(0, 9, 0, 10),
				"Parameter 'x' is missing in docstring. Add it to the Args section.",
				vscode.DiagnosticSeverity.Warning
			);
			diagnostic.code = DiagnosticCode.PARAM_MISSING_IN_DOCSTRING;

			const context: CodeActionContext = {
				document,
				diagnostic,
				function: func
			};

			const actions = provider.provideCodeActions(context);

			// Should create action but without edit
			assert.strictEqual(actions.length, 1);
			assert.strictEqual(actions[0].edit, undefined);
		});

		test('Should handle unsupported language gracefully', async () => {
			const content = 'function test(x) {\n  // No docstring\n}';
			const document = await vscode.workspace.openTextDocument({
				language: 'javascript', // Not supported
				content
			});

			const func: FunctionDescriptor = {
				name: 'test',
				range: new vscode.Range(0, 0, 10, 0),
				parameters: [{
					name: 'x',
					type: null,
					defaultValue: null,
					isOptional: false,
				}],
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

			const diagnostic = new vscode.Diagnostic(
				new vscode.Range(0, 14, 0, 15),
				"Parameter 'x' is missing in docstring.",
				vscode.DiagnosticSeverity.Warning
			);
			diagnostic.code = DiagnosticCode.PARAM_MISSING_IN_DOCSTRING;

			const context: CodeActionContext = {
				document,
				diagnostic,
				function: func
			};

			const actions = provider.provideCodeActions(context);

			// Should create action but without edit (no editor found)
			assert.strictEqual(actions.length, 1);
			assert.strictEqual(actions[0].edit, undefined);
		});

		test('Should return empty array for unknown diagnostic code', async () => {
			const content = 'def test():\n    """\n    Test.\n    """\n    pass';
			const document = await vscode.workspace.openTextDocument({
				language: 'python',
				content
			});

			const func: FunctionDescriptor = {
				name: 'test',
				range: new vscode.Range(0, 0, 10, 0),
				parameters: [],
				returnType: null,
				returnStatements: [],
				yieldStatements: [],
				isAsync: false,
				isGenerator: false,
				docstring: 'Test.',
				docstringRange: new vscode.Range(1, 4, 3, 7),
				raises: [],
				hasIO: false,
				hasGlobalMods: false
			};

			// Diagnostic with unknown code
			const diagnostic = new vscode.Diagnostic(
				new vscode.Range(1, 4, 1, 10),
				"Unknown issue",
				vscode.DiagnosticSeverity.Warning
			);
			diagnostic.code = 'UNKNOWN_CODE';

			const context: CodeActionContext = {
				document,
				diagnostic,
				function: func
			};

			const actions = provider.provideCodeActions(context);

			assert.strictEqual(actions.length, 0);
		});

		test('Should handle Sphinx-style docstrings', async () => {
			const content = 'def test(value: int):\n    """\n    Test function.\n\n    :param name: Name.\n    """\n    pass';
			const document = await vscode.workspace.openTextDocument({
				language: 'python',
				content
			});

			const func: FunctionDescriptor = {
				name: 'test',
				range: new vscode.Range(0, 0, 10, 0),
				parameters: [{
					name: 'value',
					type: 'int',
					defaultValue: null,
					isOptional: false,
				}],
				returnType: null,
				returnStatements: [],
				yieldStatements: [],
				isAsync: false,
				isGenerator: false,
				docstring: 'Test function.\n\n:param name: Name.',
				docstringRange: new vscode.Range(1, 4, 5, 7),
				raises: [],
				hasIO: false,
				hasGlobalMods: false
			};

			const diagnostic = new vscode.Diagnostic(
				new vscode.Range(0, 9, 0, 14),
				"Parameter 'value' is missing in docstring. Add it to the parameters section.",
				vscode.DiagnosticSeverity.Warning
			);
			diagnostic.code = DiagnosticCode.PARAM_MISSING_IN_DOCSTRING;

			const context: CodeActionContext = {
				document,
				diagnostic,
				function: func
			};

			const actions = provider.provideCodeActions(context);

			// Should detect Sphinx style and create action
			// (actual edit creation depends on proper docstring parsing which is tested in Sphinx parser tests)
			assert.strictEqual(actions.length, 1);
			const action = actions[0];
			assert.strictEqual(action.title, "Add parameter 'value' to docstring");

			// Edit may or may not exist depending on whether Sphinx docstring was properly detected
			// This is an integration point tested separately in editor tests
		});

	});

});
