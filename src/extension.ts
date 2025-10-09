import * as vscode from 'vscode';
import { Logger } from './utils/logger';
import { IParser } from './parsers/base';
import { PythonParser } from './parsers/python/pythonParser';
import { GoogleDocstringParser, IDocstringParser } from './docstring/python';
import { IAnalyzer } from './analyzers/base';
import { PythonSignatureAnalyzer, PythonReturnAnalyzer, PythonExceptionAnalyzer } from './analyzers/python';

// Global instances
let logger: Logger;
let diagnosticCollection: vscode.DiagnosticCollection;
let pythonParser: IParser;
let docstringParser: IDocstringParser;
let signatureAnalyzer: IAnalyzer;
let returnAnalyzer: IAnalyzer;
let exceptionAnalyzer: IAnalyzer;

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

	// Initialize parsers
	pythonParser = new PythonParser(context);
	docstringParser = new GoogleDocstringParser();
	signatureAnalyzer = new PythonSignatureAnalyzer();
	returnAnalyzer = new PythonReturnAnalyzer();
	exceptionAnalyzer = new PythonExceptionAnalyzer();
	logger.info('Initialized PythonParser, GoogleDocstringParser, and all analyzers');

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
		// Step 1: Parse the document to extract functions
		const functions = await pythonParser.parse(document);
		logger.debug(`Found ${functions.length} functions in ${document.fileName}`);

		if (functions.length === 0) {
			return;
		}

		// Step 2: Parse docstrings and analyze with signature analyzer
		const diagnostics: vscode.Diagnostic[] = [];

		for (const func of functions) {
			// Skip functions without docstrings
			if (!func.docstring) {
				logger.trace(`Function '${func.name}' has no docstring, skipping`);
				continue;
			}

			// Parse the docstring
			const parsedDocstring = docstringParser.parse(func.docstring);
			logger.trace(`Parsed docstring for '${func.name}': ${parsedDocstring.parameters.length} params documented`);

			// Use analyzers to validate parameters and returns
			const funcDiagnostics = [
				...signatureAnalyzer.analyze(func, parsedDocstring, document.uri),
				...returnAnalyzer.analyze(func, parsedDocstring, document.uri),
				...exceptionAnalyzer.analyze(func, parsedDocstring, document.uri)
			];
			diagnostics.push(...funcDiagnostics);
		}

		// Step 3: Set diagnostics
		if (diagnostics.length > 0) {
			diagnosticCollection.set(document.uri, diagnostics);
			logger.info(`Found ${diagnostics.length} issue(s) in ${document.fileName}`);
		} else {
			logger.debug(`No issues found in ${document.fileName}`);
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
