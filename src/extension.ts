import * as vscode from 'vscode';
import { Logger } from './utils/logger';
import { isEnabled } from './utils/config';
import { LanguageHandlerRegistry, createPythonHandler } from './languages';

// Global instances
let logger: Logger;
let diagnosticCollection: vscode.DiagnosticCollection;
let languageRegistry: LanguageHandlerRegistry;

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

	// Initialize language handler registry
	languageRegistry = new LanguageHandlerRegistry();

	// Register language handlers
	languageRegistry.register('python', createPythonHandler(context));
	logger.info('Registered language handlers: Python');

	// TODO (Future): Register TypeScript/JavaScript handlers
	// languageRegistry.register('typescript', createTypeScriptHandler(context));
	// languageRegistry.register('javascript', createJavaScriptHandler(context));

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

	// Note: Document close listener removed - cache clearing is now handled
	// internally by language handlers via resetCache() method

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
				logger.info('Docstring style setting changed - clearing Python cache');
				// Only Python has docstring style configuration
				languageRegistry.resetCache('python');
				// Re-analyze all open Python documents with new style
				vscode.workspace.textDocuments.forEach((document) => {
					if (shouldAnalyze(document) && document.languageId === 'python') {
						analyzeDocument(document);
					}
				});
			}

			// Reset Python executor cache when Python settings change
			// Note: pythonScriptPath changes are not handled here as that's a development
			// setting and requires extension reload anyway
			if (event.affectsConfiguration('docstringVerifier.pythonPath') ||
				event.affectsConfiguration('docstringVerifier.preferUv')) {
				logger.info('Python settings changed - resetting Python cache');
				languageRegistry.resetCache('python');
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

	// Check if language is supported by checking registry
	return languageRegistry.isSupported(document.languageId);
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
		// Get language handler for this document
		const handler = languageRegistry.get(document.languageId);
		if (!handler) {
			logger.error(`No handler registered for language: ${document.languageId}`);
			return;
		}

		// Step 1: Parse the document to extract functions
		const functions = await handler.parser.parse(document);
		logger.debug(`Found ${functions.length} functions in ${document.fileName}`);

		if (functions.length === 0) {
			return;
		}

		// Step 2: Select appropriate docstring parser (language-specific logic)
		const docstringParser = handler.selectDocstringParser
			? handler.selectDocstringParser(document, functions)
			: handler.docstringParsers.values().next().value;

		if (!docstringParser) {
			logger.error(`No docstring parser available for ${document.languageId}`);
			return;
		}

		logger.debug(`Using docstring parser for ${document.languageId}`);

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

			// Run all analyzers for this language
			for (const analyzer of handler.analyzers) {
				const funcDiagnostics = analyzer.analyze(func, parsedDocstring, document.uri);
				diagnostics.push(...funcDiagnostics);
			}
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
