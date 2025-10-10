/**
 * Tests for Code Action Provider.
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { DocstringCodeActionProvider } from '../../../codeActions/provider';
import { ParameterFixProvider } from '../../../codeActions/fixes/parameterFixes';
import { DiagnosticCode } from '../../../diagnostics/types';
import { FunctionDescriptor } from '../../../parsers/types';
import { EditorHandlerRegistry } from '../../../editors/registry';
import { createPythonEditorHandler } from '../../../editors/python';

suite('Code Action Provider Tests', () => {
	let provider: DocstringCodeActionProvider;
	let parsedFunctionsCache: Map<string, FunctionDescriptor[]>;

	setup(() => {
		parsedFunctionsCache = new Map();
		provider = new DocstringCodeActionProvider(parsedFunctionsCache);

		// Create editor registry for ParameterFixProvider
		const editorRegistry = new EditorHandlerRegistry();
		editorRegistry.register('python', createPythonEditorHandler());

		provider.registerFixProvider(new ParameterFixProvider(editorRegistry));
	});

	test('Should filter diagnostics by source', () => {
		// Create mock document with uri
		const document = {
			uri: vscode.Uri.file('/test/file.py'),
			languageId: 'python',
			fileName: '/test/file.py',
		} as vscode.TextDocument;
		const range = new vscode.Range(0, 0, 0, 0);

		// Create diagnostics from different sources
		const ourDiagnostic = new vscode.Diagnostic(
			range,
			'Test message',
			vscode.DiagnosticSeverity.Warning
		);
		ourDiagnostic.source = 'docstring-verifier';
		ourDiagnostic.code = DiagnosticCode.PARAM_MISSING_IN_DOCSTRING;

		const otherDiagnostic = new vscode.Diagnostic(
			range,
			'Other message',
			vscode.DiagnosticSeverity.Warning
		);
		otherDiagnostic.source = 'other-extension';

		const context: vscode.CodeActionContext = {
			diagnostics: [ourDiagnostic, otherDiagnostic],
			only: undefined,
			triggerKind: vscode.CodeActionTriggerKind.Automatic,
		};

		// Provider should only process our diagnostics
		const actions = provider.provideCodeActions(
			document,
			range,
			context,
			{} as vscode.CancellationToken
		);

		// We expect undefined since there are no cached functions for this document
		assert.ok(actions === undefined || actions.length === 0);
	});

	test('Should return undefined for non-docstring-verifier diagnostics', () => {
		const document = {
			uri: vscode.Uri.file('/test/file.py'),
			languageId: 'python',
			fileName: '/test/file.py',
		} as vscode.TextDocument;
		const range = new vscode.Range(0, 0, 0, 0);

		const otherDiagnostic = new vscode.Diagnostic(
			range,
			'Other message',
			vscode.DiagnosticSeverity.Warning
		);
		otherDiagnostic.source = 'other-extension';

		const context: vscode.CodeActionContext = {
			diagnostics: [otherDiagnostic],
			only: undefined,
			triggerKind: vscode.CodeActionTriggerKind.Automatic,
		};

		const actions = provider.provideCodeActions(
			document,
			range,
			context,
			{} as vscode.CancellationToken
		);

		assert.strictEqual(actions, undefined);
	});

	test('Should register fix providers', () => {
		const newParsedFunctionsCache = new Map<string, FunctionDescriptor[]>();
		const newProvider = new DocstringCodeActionProvider(newParsedFunctionsCache);

		const editorRegistry = new EditorHandlerRegistry();
		editorRegistry.register('python', createPythonEditorHandler());
		const fixProvider = new ParameterFixProvider(editorRegistry);

		// Should not throw
		assert.doesNotThrow(() => {
			newProvider.registerFixProvider(fixProvider);
		});
	});
});

suite('Parameter Fix Provider Tests', () => {
	let provider: ParameterFixProvider;
	let editorRegistry: EditorHandlerRegistry;

	setup(() => {
		editorRegistry = new EditorHandlerRegistry();
		editorRegistry.register('python', createPythonEditorHandler());
		provider = new ParameterFixProvider(editorRegistry);
	});

	test('Should handle DSV102 diagnostic', () => {
		const diagnostic = new vscode.Diagnostic(
			new vscode.Range(0, 0, 0, 0),
			'Parameter missing',
			vscode.DiagnosticSeverity.Warning
		);
		diagnostic.code = DiagnosticCode.PARAM_MISSING_IN_DOCSTRING;

		assert.ok(provider.canProvide(diagnostic));
	});

	test('Should handle DSV101 diagnostic', () => {
		const diagnostic = new vscode.Diagnostic(
			new vscode.Range(0, 0, 0, 0),
			'Parameter in docstring but not in code',
			vscode.DiagnosticSeverity.Warning
		);
		diagnostic.code = DiagnosticCode.PARAM_MISSING_IN_CODE;

		assert.ok(provider.canProvide(diagnostic));
	});

	test('Should handle DSV103 diagnostic', () => {
		const diagnostic = new vscode.Diagnostic(
			new vscode.Range(0, 0, 0, 0),
			'Type mismatch',
			vscode.DiagnosticSeverity.Warning
		);
		diagnostic.code = DiagnosticCode.PARAM_TYPE_MISMATCH;

		assert.ok(provider.canProvide(diagnostic));
	});

	test('Should handle DSV104 diagnostic', () => {
		const diagnostic = new vscode.Diagnostic(
			new vscode.Range(0, 0, 0, 0),
			'Optional mismatch',
			vscode.DiagnosticSeverity.Warning
		);
		diagnostic.code = DiagnosticCode.PARAM_OPTIONAL_MISMATCH;

		assert.ok(provider.canProvide(diagnostic));
	});

	test('Should not handle non-parameter diagnostics', () => {
		const diagnostic = new vscode.Diagnostic(
			new vscode.Range(0, 0, 0, 0),
			'Return type mismatch',
			vscode.DiagnosticSeverity.Warning
		);
		diagnostic.code = DiagnosticCode.RETURN_TYPE_MISMATCH;

		assert.ok(!provider.canProvide(diagnostic));
	});

	test('Should provide action for DSV102', () => {
		const diagnostic = new vscode.Diagnostic(
			new vscode.Range(0, 0, 0, 0),
			'Parameter missing',
			vscode.DiagnosticSeverity.Warning
		);
		diagnostic.code = DiagnosticCode.PARAM_MISSING_IN_DOCSTRING;

		const context = {
			document: {} as vscode.TextDocument,
			diagnostic,
			function: {} as any, // Mock function descriptor
		};

		const actions = provider.provideCodeActions(context);

		assert.strictEqual(actions.length, 1);
		assert.strictEqual(actions[0].title, 'Add missing parameter to docstring');
		assert.strictEqual(actions[0].kind, vscode.CodeActionKind.QuickFix);
		assert.ok(actions[0].isPreferred);
	});
});
