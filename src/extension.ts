import * as vscode from 'vscode';
import { Logger } from './utils/logger';
import { isEnabled, getDocstringStyle } from './utils/config';
import { IParser } from './parsers/base';
import { PythonParser } from './parsers/python/pythonParser';
import { GoogleDocstringParser, IDocstringParser, detectFileDocstringStyle } from './docstring/python';
import { IAnalyzer } from './analyzers/base';
import { PythonSignatureAnalyzer, PythonReturnAnalyzer, PythonExceptionAnalyzer, PythonSideEffectsAnalyzer } from './analyzers/python';

// Global instances
let logger: Logger;
let diagnosticCollection: vscode.DiagnosticCollection;
let pythonParser: IParser;
let docstringParser: IDocstringParser;
let signatureAnalyzer: IAnalyzer;
let returnAnalyzer: IAnalyzer;
let exceptionAnalyzer: IAnalyzer;
let sideEffectsAnalyzer: IAnalyzer;

// Cache for detected docstring styles per document
// Key: document.uri.toString(), Value: detected style
const docstringStyleCache = new Map<string, 'google' | 'sphinx'>();

// Track documents currently being analyzed to prevent concurrent analysis
const analyzingDocuments = new Set<string>();

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
	sideEffectsAnalyzer = new PythonSideEffectsAnalyzer();
	logger.info('Initialized PythonParser, GoogleDocstringParser, and all analyzers');

	// Register document save listener
	// Note: We analyze on save rather than on every change to avoid performance issues
	// and because diagnostics are less useful while user is still typing
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

	// Register document close listener - clear cache
	context.subscriptions.push(
		vscode.workspace.onDidCloseTextDocument((document) => {
			const docUri = document.uri.toString();
			if (docstringStyleCache.has(docUri)) {
				docstringStyleCache.delete(docUri);
				logger.trace(`Cleared docstring style cache for: ${document.fileName}`);
			}
		})
	);

	// Analyze all currently open documents
	vscode.workspace.textDocuments.forEach((document) => {
		if (shouldAnalyze(document)) {
			analyzeDocument(document);
		}
	});

	// Watch for configuration changes
	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration((event) => {
			if (event.affectsConfiguration('docstringVerifier.enable')) {
				logger.info('Extension enable/disable setting changed');
				// Re-analyze all open documents or clear diagnostics
				if (isEnabled()) {
					logger.info('Extension enabled - analyzing open documents');
					vscode.workspace.textDocuments.forEach((document) => {
						if (shouldAnalyze(document)) {
							analyzeDocument(document);
						}
					});
				} else {
					logger.info('Extension disabled - clearing diagnostics');
					diagnosticCollection.clear();
				}
			}

			if (event.affectsConfiguration('docstringVerifier.docstringStyle')) {
				logger.info('Docstring style setting changed - clearing cache');
				docstringStyleCache.clear();
				// Re-analyze all open documents with new style
				vscode.workspace.textDocuments.forEach((document) => {
					if (shouldAnalyze(document)) {
						analyzeDocument(document);
					}
				});
			}

			// Reset Python executor cache when Python settings change
			// Note: pythonScriptPath changes are not handled here as that's a development
			// setting and requires extension reload anyway
			if (event.affectsConfiguration('docstringVerifier.pythonPath') ||
				event.affectsConfiguration('docstringVerifier.preferUv')) {
				logger.info('Python settings changed - resetting Python executor');
				pythonParser.resetExecutor?.();
				// Re-analyze all open Python documents
				vscode.workspace.textDocuments.forEach((document) => {
					if (shouldAnalyze(document) && document.languageId === 'python') {
						analyzeDocument(document);
					}
				});
			}

			// Note: logLevel changes are handled by Logger class internally
		})
	);

	logger.info('Docstring Verifier extension activated successfully');
}

/**
 * Check if a document should be analyzed.
 */
function shouldAnalyze(document: vscode.TextDocument): boolean {
	// Check if extension is enabled via config utility
	if (!isEnabled()) {
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
	const docUri = document.uri.toString();

	// Prevent concurrent analysis of the same document
	if (analyzingDocuments.has(docUri)) {
		logger.trace(`Analysis already in progress for: ${document.fileName}`);
		return;
	}

	analyzingDocuments.add(docUri);
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

		// Step 2: Auto-detect docstring style if needed
		const configuredStyle = getDocstringStyle();
		let detectedStyle: 'google' | 'sphinx' = 'google';

		if (configuredStyle === 'auto') {
			// Check cache first
			const cachedStyle = docstringStyleCache.get(docUri);

			if (cachedStyle) {
				detectedStyle = cachedStyle;
				logger.trace(`Using cached docstring style: ${detectedStyle}`);
			} else {
				// Collect docstrings for style detection (limited to first 20 for performance)
				const docstrings = functions
					.map(f => f.docstring)
					.filter((d): d is string => d !== null);

				const detected = detectFileDocstringStyle(docstrings);
				detectedStyle = detected === 'unknown' ? 'google' : detected;

				// Cache the result
				docstringStyleCache.set(docUri, detectedStyle);
				logger.debug(`Auto-detected and cached docstring style: ${detectedStyle}`);
			}
		} else {
			detectedStyle = configuredStyle;
			logger.debug(`Using configured docstring style: ${detectedStyle}`);
		}

		// TODO: Support Sphinx parser in addition to Google
		// For now, we only support Google-style parsing
		if (detectedStyle === 'sphinx') {
			logger.info('Sphinx-style docstrings detected, but parser not yet implemented');
			// Fall back to Google parser for now
		}

		// Step 3: Parse docstrings and analyze
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
				...exceptionAnalyzer.analyze(func, parsedDocstring, document.uri),
				...sideEffectsAnalyzer.analyze(func, parsedDocstring, document.uri)
			];
			diagnostics.push(...funcDiagnostics);
		}

		// Step 4: Set diagnostics
		if (diagnostics.length > 0) {
			diagnosticCollection.set(document.uri, diagnostics);
			logger.info(`Found ${diagnostics.length} issue(s) in ${document.fileName}`);
		} else {
			logger.debug(`No issues found in ${document.fileName}`);
		}

	} catch (error) {
		logger.error(`Error analyzing document: ${error}`);
	} finally {
		// Always remove from tracking set
		analyzingDocuments.delete(docUri);
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
