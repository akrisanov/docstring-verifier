/**
 * Command to apply Quick Fix and trigger re-analysis.
 *
 * This command:
 * 1. Applies the workspace edit
 * 2. Saves the document automatically
 * 3. The save triggers onDidSaveTextDocument event which re-analyzes the document
 */

import * as vscode from 'vscode';
import { Logger } from '../../utils/logger';
import { FunctionDescriptor, ParameterDescriptor } from '../../parsers/types';
import { ILLMService } from '../../llm/base';

/**
 * Additional context for Quick Fix application.
 */
interface QuickFixContext {
	/** Type of fix being applied */
	type: 'add-parameter' | 'remove-parameter' | 'fix-type' | 'fix-optional';
	/** If type is 'add-parameter', details about the parameter and function */
	parameterDetails?: {
		functionDescriptor: FunctionDescriptor;
		parameterDescriptor: ParameterDescriptor;
		docstringRange: vscode.Range;
	};
}

/**
 * Register the apply Quick Fix command.
 */
export function registerApplyQuickFixCommand(
	context: vscode.ExtensionContext,
	getLLMService: () => ILLMService | undefined
): void {
	const logger = new Logger('Docstring Verifier - Apply Quick Fix');

	const command = vscode.commands.registerCommand(
		'docstring-verifier.applyQuickFix',
		async (
			documentUri: vscode.Uri,
			edit: vscode.WorkspaceEdit,
			quickFixContext?: QuickFixContext
		) => {
			try {
				logger.debug(`Applying Quick Fix for: ${documentUri.fsPath}`);

				// Apply the workspace edit
				const success = await vscode.workspace.applyEdit(edit);

				if (!success) {
					logger.error('Failed to apply workspace edit');
					vscode.window.showErrorMessage('Failed to apply Quick Fix');
					return;
				}

				logger.debug('Quick Fix applied successfully');

				// Get the document
				const document = await vscode.workspace.openTextDocument(documentUri);

				// Save the document to trigger re-analysis via onDidSaveTextDocument
				// Note: onDidChangeTextDocument doesn't fire for programmatic edits via WorkspaceEdit,
				// so we use document.save() to trigger the onDidSaveTextDocument event instead
				await document.save();

				logger.debug('Document saved, re-analysis triggered');

				// If this was an "add parameter" fix and LLM service is available,
				// trigger AI enhancement to replace the TODO placeholder
				if (quickFixContext?.type === 'add-parameter' && quickFixContext.parameterDetails) {
					const llmService = getLLMService();
					if (llmService) {
						logger.debug('Triggering LLM enhancement for added parameter');

						// Small delay to ensure document is saved and updated
						setTimeout(async () => {
							try {
								await vscode.commands.executeCommand(
									'docstring-verifier.enhanceParameterDescription',
									documentUri,
									quickFixContext.parameterDetails!.functionDescriptor,
									quickFixContext.parameterDetails!.parameterDescriptor,
									quickFixContext.parameterDetails!.docstringRange
								);
							} catch (error) {
								logger.warn(`Failed to trigger LLM enhancement: ${error}`);
							}
						}, 500); // 500ms delay
					}
				}

			} catch (error) {
				logger.error(`Error applying Quick Fix: ${error}`);
				vscode.window.showErrorMessage(`Error applying Quick Fix: ${error instanceof Error ? error.message : String(error)}`);
			}
		}
	);

	context.subscriptions.push(command);
	logger.info('Registered apply Quick Fix command');
}
