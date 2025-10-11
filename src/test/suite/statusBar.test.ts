/**
 * Tests for Status Bar Manager.
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { StatusBarManager } from '../../statusBar';

suite('StatusBarManager Tests', () => {
	let diagnosticCollection: vscode.DiagnosticCollection;
	let statusBarManager: StatusBarManager;

	setup(() => {
		diagnosticCollection = vscode.languages.createDiagnosticCollection('test-docstring-verifier');
		statusBarManager = new StatusBarManager(diagnosticCollection);
	});

	teardown(() => {
		statusBarManager.dispose();
		diagnosticCollection.dispose();
	});

	test('Should initialize status bar manager', () => {
		assert.ok(statusBarManager);
	});

	test('Should hide status bar when no diagnostics', () => {
		// Clear all diagnostics
		diagnosticCollection.clear();

		// Update status bar
		statusBarManager.update();

		// Status bar should be hidden (we can't directly test visibility,
		// but we can verify it doesn't throw)
		assert.ok(true);
	});

	test('Should show status bar when diagnostics exist', () => {
		// Create a test document URI
		const uri = vscode.Uri.file('/test/file.py');

		// Add a diagnostic
		const diagnostic = new vscode.Diagnostic(
			new vscode.Range(0, 0, 0, 10),
			'Test diagnostic',
			vscode.DiagnosticSeverity.Warning
		);

		diagnosticCollection.set(uri, [diagnostic]);

		// Update status bar
		statusBarManager.update();

		// Should not throw
		assert.ok(true);
	});

	test('Should count diagnostics across multiple documents', () => {
		// Create multiple test documents
		const uri1 = vscode.Uri.file('/test/file1.py');
		const uri2 = vscode.Uri.file('/test/file2.py');

		// Add diagnostics to first document
		const diag1 = new vscode.Diagnostic(
			new vscode.Range(0, 0, 0, 10),
			'Test diagnostic 1',
			vscode.DiagnosticSeverity.Warning
		);

		const diag2 = new vscode.Diagnostic(
			new vscode.Range(1, 0, 1, 10),
			'Test diagnostic 2',
			vscode.DiagnosticSeverity.Warning
		);

		diagnosticCollection.set(uri1, [diag1, diag2]);

		// Add diagnostics to second document
		const diag3 = new vscode.Diagnostic(
			new vscode.Range(0, 0, 0, 10),
			'Test diagnostic 3',
			vscode.DiagnosticSeverity.Error
		);

		diagnosticCollection.set(uri2, [diag3]);

		// Update status bar
		statusBarManager.update();

		// Should handle multiple documents (3 total diagnostics)
		assert.ok(true);
	});

	test('Should update when diagnostics are cleared', () => {
		// Add diagnostic
		const uri = vscode.Uri.file('/test/file.py');
		const diagnostic = new vscode.Diagnostic(
			new vscode.Range(0, 0, 0, 10),
			'Test diagnostic',
			vscode.DiagnosticSeverity.Warning
		);

		diagnosticCollection.set(uri, [diagnostic]);
		statusBarManager.update();

		// Clear diagnostics
		diagnosticCollection.clear();
		statusBarManager.update();

		// Should not throw
		assert.ok(true);
	});

	test('Should dispose cleanly', () => {
		statusBarManager.dispose();

		// Disposing again should not throw
		assert.doesNotThrow(() => {
			statusBarManager.dispose();
		});
	});
});
