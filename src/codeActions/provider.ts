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

	constructor() {
		this.logger = new Logger('Docstring Verifier - Code Actions');
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
	 * TODO: This is a temporary implementation that needs to be improved.
	 * Currently it returns null because we need access to the parsed functions.
	 *
	 * Options:
	 * 1. Cache parsed functions in extension.ts and expose via context
	 * 2. Re-parse the document (expensive but reliable)
	 * 3. Store function info in diagnostic.relatedInformation
	 * 4. Use a global cache/registry
	 *
	 * For now, we'll implement option 2 (re-parse) as it's most reliable.
	 */
	private findFunctionForDiagnostic(
		document: vscode.TextDocument,
		diagnostic: vscode.Diagnostic
	): FunctionDescriptor | null {
		// TODO: Implement function lookup
		// For now, return null - this will be implemented when we integrate with parsers
		this.logger.trace(`Looking up function for diagnostic at line ${diagnostic.range.start.line}`);
		return null;
	}
}

/**
 * Create and register the code action provider.
 */
export function registerCodeActionProvider(context: vscode.ExtensionContext): DocstringCodeActionProvider {
	const provider = new DocstringCodeActionProvider();

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
