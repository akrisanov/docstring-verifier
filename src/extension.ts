import * as vscode from 'vscode';
import { Logger } from './utils/logger';
import { IParser } from './parsers/base';
import { MockPythonParser } from './parsers/python/mockParser';
import { DiagnosticCode } from './diagnostics/types';

// Global instances
let logger: Logger;
let diagnosticCollection: vscode.DiagnosticCollection;
let pythonParser: IParser;

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

	// Initialize parsers (mock for now, will be replaced with real parser in Day 2)
	pythonParser = new MockPythonParser();
	logger.debug('Using MockPythonParser for testing');

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
 */
async function analyzeDocument(document: vscode.TextDocument): Promise<void> {
	logger.trace(`Analyzing document: ${document.fileName}`);

	// Clear existing diagnostics for this document
	diagnosticCollection.delete(document.uri);

	try {
		// Step 1: Parse the document
		const functions = await pythonParser.parse(document);
		logger.debug(`Found ${functions.length} functions in ${document.fileName}`);

		if (functions.length === 0) {
			return;
		}

		// Step 2: Create mock diagnostic for testing
		// This simulates finding a parameter 'x' in code but missing in docstring
		const diagnostics: vscode.Diagnostic[] = [];

		for (const func of functions) {
			// Check if parameter 'x' exists in code but not in docstring
			const xParam = func.parameters.find(p => p.name === 'x');
			if (xParam && func.docstring && !func.docstring.includes('x')) {
				const diagnostic = new vscode.Diagnostic(
					func.docstringRange || func.range,
					`Parameter 'x' is missing in docstring for function '${func.name}'`,
					vscode.DiagnosticSeverity.Warning
				);
				diagnostic.code = DiagnosticCode.PARAM_MISSING_IN_DOCSTRING;
				diagnostic.source = 'docstring-verifier';
				diagnostics.push(diagnostic);

				logger.debug(`Created diagnostic for missing parameter 'x' in ${func.name}`);
			}
		}

		// Step 3: Set diagnostics
		if (diagnostics.length > 0) {
			diagnosticCollection.set(document.uri, diagnostics);
			logger.info(`Found ${diagnostics.length} issue(s) in ${document.fileName}`);
		}

	} catch (error) {
		logger.error(`Error analyzing document: ${error}`);
	}

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
