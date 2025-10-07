import * as vscode from 'vscode';
import { Logger } from './utils/logger';

// Global instances
let logger: Logger;
let diagnosticCollection: vscode.DiagnosticCollection;

/**
 * Called when the extension is activated.
 * This happens when a Python or TypeScript file is opened.
 */
export function activate(context: vscode.ExtensionContext) {
	// Initialize logger
	logger = new Logger('Docstring Verifier');
	logger.info('Docstring Verifier extension activating...');

	// Create diagnostic collection for our errors/warnings
	diagnosticCollection = vscode.languages.createDiagnosticCollection('docstring-verifier');
	context.subscriptions.push(diagnosticCollection);

	// Register document change listener
	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument((event) => {
			// Only analyze Python and TypeScript files
			if (shouldAnalyze(event.document)) {
				logger.debug(`Document changed: ${event.document.fileName}`);
				// TODO: Debounce and analyze document
				analyzeDocument(event.document);
			}
		})
	);

	// Register document save listener
	context.subscriptions.push(
		vscode.workspace.onDidSaveTextDocument((document) => {
			if (shouldAnalyze(document)) {
				logger.debug(`Document saved: ${document.fileName}`);
				analyzeDocument(document);
			}
		})
	);

	// Register document open listener
	context.subscriptions.push(
		vscode.workspace.onDidOpenTextDocument((document) => {
			if (shouldAnalyze(document)) {
				logger.debug(`Document opened: ${document.fileName}`);
				analyzeDocument(document);
			}
		})
	);

	// Analyze all currently open documents
	vscode.workspace.textDocuments.forEach((document) => {
		if (shouldAnalyze(document)) {
			analyzeDocument(document);
		}
	});

	logger.info('Docstring Verifier extension activated successfully');
}

/**
 * Check if a document should be analyzed.
 */
function shouldAnalyze(document: vscode.TextDocument): boolean {
	// Check if extension is enabled
	const config = vscode.workspace.getConfiguration('docstringVerifier');
	if (!config.get<boolean>('enable', true)) {
		return false;
	}

	// Only analyze Python and TypeScript files
	const supportedLanguages = ['python', 'typescript', 'javascript'];
	return supportedLanguages.includes(document.languageId);
}

/**
 * Analyze a document for docstring mismatches.
 * This is a placeholder that will be implemented in later stages.
 */
function analyzeDocument(document: vscode.TextDocument): void {
	logger.trace(`Analyzing document: ${document.fileName}`);

	// Clear existing diagnostics for this document
	diagnosticCollection.delete(document.uri);

	// TODO: 1. Add mock diagnostic
	// TODO: 2. Add real parser
	// TODO: 3. Add real analyzers

	logger.trace(`Analysis complete for: ${document.fileName}`);
}

/**
 * Called when the extension is deactivated.
 * Clean up resources.
 */
export function deactivate() {
	logger?.info('Docstring Verifier extension deactivating...');

	// Dispose of diagnostic collection
	diagnosticCollection?.dispose();

	// Dispose of logger
	logger?.dispose();
}
