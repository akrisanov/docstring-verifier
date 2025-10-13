import * as vscode from 'vscode';
import { Logger } from './utils/logger';
import { isEnabled, isLLMEnabled, getLLMTimeout, getLLMProvider } from './utils/config';
import { LanguageHandlerRegistry, createPythonHandler } from './languages';
import { registerCodeActionProvider, ParameterFixProvider } from './codeActions';
import { registerEnhanceDescriptionCommand, registerApplyQuickFixCommand } from './codeActions/commands';
import { FunctionDescriptor } from './parsers/types';
import { EditorHandlerRegistry, createPythonEditorHandler } from './editors';
import { ILLMService, GitHubCopilotLLMService } from './llm';
import { ConfigurationHandler, DocumentEventHandler } from './extension/index';
import { StatusBarManager } from './statusBar';

// Global instances
let logger: Logger;
let diagnosticCollection: vscode.DiagnosticCollection;
let languageRegistry: LanguageHandlerRegistry;
let editorRegistry: EditorHandlerRegistry;
let llmService: ILLMService | undefined;
let documentEventHandler: DocumentEventHandler;
let statusBarManager: StatusBarManager;

// Cache of parsed functions per document
// Key: document URI, Value: array of FunctionDescriptor
const parsedFunctionsCache = new Map<string, FunctionDescriptor[]>();

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

	// Initialize editor handler registry
	editorRegistry = new EditorHandlerRegistry();

	// Register editor handlers
	editorRegistry.register('python', createPythonEditorHandler());
	logger.info('Registered editor handlers: Python');

	// TODO (Future): Register TypeScript/JavaScript handlers
	// languageRegistry.register('typescript', createTypeScriptHandler(context));
	// languageRegistry.register('javascript', createJavaScriptHandler(context));
	// editorRegistry.register('typescript', createTypeScriptEditorHandler());

	// Initialize LLM service if enabled
	if (isLLMEnabled()) {
		const llmProvider = getLLMProvider();
		const llmTimeout = getLLMTimeout();

		if (llmProvider === 'github-copilot') {
			llmService = new GitHubCopilotLLMService(llmTimeout);
			logger.info(`Initialized GitHub Copilot LLM service (timeout: ${llmTimeout}ms)`);
		} else {
			logger.warn(`Unknown LLM provider: ${llmProvider}`);
		}
	} else {
		logger.info('LLM service disabled in settings');
	}

	// Register Code Action Provider for Quick Fixes
	const codeActionProvider = registerCodeActionProvider(context, parsedFunctionsCache);

	// Register fix providers
	codeActionProvider.registerFixProvider(new ParameterFixProvider(editorRegistry, llmService));
	logger.info('Registered Code Action Provider with fix providers');

	// Register Quick Fix application command
	// This command applies the edit and saves the document to trigger re-analysis
	registerApplyQuickFixCommand(context, () => llmService);
	logger.info('Registered apply Quick Fix command');

	// Register LLM enhancement command if LLM service is available
	if (llmService) {
		registerEnhanceDescriptionCommand(context, llmService, editorRegistry);
		logger.info('Registered LLM enhancement command');
	}

	// Initialize status bar manager
	statusBarManager = new StatusBarManager(diagnosticCollection);
	context.subscriptions.push(statusBarManager);
	logger.info('Initialized status bar manager');

	// Create event handlers
	documentEventHandler = new DocumentEventHandler({
		logger,
		parsedFunctionsCache,
		analyzeDocument,
		shouldAnalyze,
	});

	const configurationHandler = new ConfigurationHandler({
		logger,
		diagnosticCollection,
		languageRegistry,
		getLLMService: () => llmService,
		setLLMService: (service) => { llmService = service; },
		analyzeDocument,
		shouldAnalyze,
	});

	// Register document event listeners
	// Note: We analyze on save for immediate feedback, and on change (with debouncing)
	// to update diagnostics after Quick Fixes are applied
	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument((event) => {
			documentEventHandler.handleDocumentChange(event);
		})
	);

	context.subscriptions.push(
		vscode.workspace.onDidSaveTextDocument((document) => {
			documentEventHandler.handleDocumentSave(document);
		})
	);

	context.subscriptions.push(
		vscode.workspace.onDidOpenTextDocument((document) => {
			documentEventHandler.handleDocumentOpen(document);
		})
	);

	context.subscriptions.push(
		vscode.workspace.onDidCloseTextDocument((document) => {
			documentEventHandler.handleDocumentClose(document);
		})
	);

	// Analyze all currently open documents
	documentEventHandler.analyzeOpenDocuments();

	// Watch for configuration changes
	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration((event) => {
			configurationHandler.handleConfigurationChange(event);
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

		// Cache parsed functions for use in Code Actions
		parsedFunctionsCache.set(document.uri.toString(), functions);

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

		// Update status bar
		statusBarManager?.update();

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

	// Clean up document event handler
	documentEventHandler?.dispose();

	// Clear caches
	parsedFunctionsCache.clear();
	analyzingDocuments.clear();

	// Dispose of diagnostic collection
	diagnosticCollection?.dispose();

	// Dispose of logger
	logger?.dispose();

	logger?.info('Docstring Verifier extension deactivated');
}
