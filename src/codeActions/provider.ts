/**
 * Main Code Action Provider for Docstring Verifier.
 * Registers with VS Code and delegates to specific fix providers.
 */

import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { FunctionDescriptor } from '../parsers/types';
import { ICodeActionProvider, CodeActionContext } from './types';

/**
 * Code Action Provider for docstring-related diagnostics.
 * Provides Quick Fixes for DSV101-DSV401 diagnostic codes.
 */
export class DocstringCodeActionProvider implements vscode.CodeActionProvider {
	public static readonly providedCodeActionKinds = [
		vscode.CodeActionKind.QuickFix
	];

	private logger: Logger;
	private fixProviders: ICodeActionProvider[] = [];
	private parsedFunctionsCache: Map<string, FunctionDescriptor[]>;

	constructor(parsedFunctionsCache: Map<string, FunctionDescriptor[]>) {
		this.logger = new Logger('Docstring Verifier - Code Actions');
		this.parsedFunctionsCache = parsedFunctionsCache;
	}

	/**
	 * Register a fix provider.
	 */
	registerFixProvider(provider: ICodeActionProvider): void {
		this.fixProviders.push(provider);
		this.logger.debug(`Registered fix provider: ${provider.constructor.name}`);
	}

	/**
	 * Provide code actions for diagnostics in the given range.
	 */
	provideCodeActions(
		document: vscode.TextDocument,
		range: vscode.Range | vscode.Selection,
		context: vscode.CodeActionContext,
		token: vscode.CancellationToken
	): vscode.CodeAction[] | undefined {
		// Filter diagnostics that belong to our extension
		const ourDiagnostics = context.diagnostics.filter(
			diagnostic => diagnostic.source === 'docstring-verifier'
		);

		if (ourDiagnostics.length === 0) {
			return undefined;
		}

		this.logger.trace(`Providing code actions for ${ourDiagnostics.length} diagnostic(s)`);

		const actions: vscode.CodeAction[] = [];

		for (const diagnostic of ourDiagnostics) {
			// Find the function that contains this diagnostic
			const func = this.findFunctionForDiagnostic(document, diagnostic);
			if (!func) {
				this.logger.warn(`Could not find function for diagnostic at line ${diagnostic.range.start.line}`);
				continue;
			}

			// Create action context
			const actionContext: CodeActionContext = {
				document,
				diagnostic,
				function: func,
			};

			// Ask each fix provider if it can handle this diagnostic
			for (const provider of this.fixProviders) {
				if (provider.canProvide(diagnostic)) {
					const providerActions = provider.provideCodeActions(actionContext);
					actions.push(...providerActions);
				}
			}
		}

		this.logger.debug(`Provided ${actions.length} code action(s)`);
		return actions.length > 0 ? actions : undefined;
	}

	/**
	 * Find the function descriptor for a given diagnostic.
	 *
	 * Uses the cached parsed functions from extension.ts.
	 * Finds the function that contains the diagnostic range.
	 */
	private findFunctionForDiagnostic(
		document: vscode.TextDocument,
		diagnostic: vscode.Diagnostic
	): FunctionDescriptor | null {
		const docUri = document.uri.toString();
		const functions = this.parsedFunctionsCache.get(docUri);

		if (!functions || functions.length === 0) {
			this.logger.warn(`No cached functions found for document: ${document.fileName}`);
			return null;
		}

		// Find the function that contains the diagnostic
		// The diagnostic range is typically on the function definition line or docstring
		const diagnosticLine = diagnostic.range.start.line;

		for (const func of functions) {
			// Check if diagnostic is within function range
			if (diagnosticLine >= func.range.start.line && diagnosticLine <= func.range.end.line) {
				this.logger.trace(`Found function '${func.name}' for diagnostic at line ${diagnosticLine}`);
				return func;
			}
		}

		this.logger.warn(`No function found containing diagnostic at line ${diagnosticLine}`);
		return null;
	}
}

/**
 * Create and register the code action provider.
 */
export function registerCodeActionProvider(
	context: vscode.ExtensionContext,
	parsedFunctionsCache: Map<string, FunctionDescriptor[]>
): DocstringCodeActionProvider {
	const provider = new DocstringCodeActionProvider(parsedFunctionsCache);

	// Register with VS Code
	const registration = vscode.languages.registerCodeActionsProvider(
		[
			{ language: 'python', scheme: 'file' },
			{ language: 'python', scheme: 'untitled' },
		],
		provider,
		{
			providedCodeActionKinds: DocstringCodeActionProvider.providedCodeActionKinds,
		}
	);

	context.subscriptions.push(registration);

	return provider;
}
