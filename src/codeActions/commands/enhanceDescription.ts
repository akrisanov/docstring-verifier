/**
 * Command handler for enhancing parameter descriptions with LLM.
 */

import * as vscode from 'vscode';
import { Logger } from '../../utils/logger';
import { ILLMService, ParameterDescriptionContext } from '../../llm';
import { FunctionDescriptor, ParameterDescriptor } from '../../parsers/types';
import { EditorHandlerRegistry } from '../../editors/registry';

const logger = new Logger('Docstring Verifier - Enhance Description Command');

/**
 * Register command for enhancing parameter descriptions with AI.
 */
export function registerEnhanceDescriptionCommand(
	context: vscode.ExtensionContext,
	llmService: ILLMService | undefined,
	editorRegistry: EditorHandlerRegistry
): void {
	const command = vscode.commands.registerCommand(
		'docstring-verifier.enhanceParameterDescription',
		async (
			documentUri: vscode.Uri,
			func: FunctionDescriptor,
			param: ParameterDescriptor,
			docstringRange: vscode.Range
		) => {
			if (!llmService) {
				logger.warn('LLM service not available');
				return;
			}

			// Show progress notification
			await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: `Generating description for parameter '${param.name}'...`,
					cancellable: false
				},
				async () => {
					try {
						// Prepare context for LLM
						const llmContext: ParameterDescriptionContext = {
							paramName: param.name,
							paramType: param.type || null,
							functionName: func.name,
							functionSignature: `${func.name}(${func.parameters.map(p => `${p.name}: ${p.type || 'Any'}`).join(', ')})`,
							codeBody: '', // Not available in FunctionDescriptor
							existingDocstring: func.docstring || undefined
						};

						// Generate description using LLM
						logger.debug(`Requesting LLM description for parameter '${param.name}'`);
						const result = await llmService.generateParameterDescription(llmContext);

						if (!result) {
							logger.warn('LLM returned null result');
							vscode.window.showWarningMessage(
								`Could not generate AI description for '${param.name}'`
							);
							return;
						}

						logger.debug(`LLM generated description: ${result.description} (from cache: ${result.fromCache})`);

						// Open the document
						const document = await vscode.workspace.openTextDocument(documentUri);

						// Get editor for the language
						const editor = editorRegistry.getEditorAuto(
							document.languageId,
							document.getText(docstringRange)
						);

						if (!editor) {
							logger.error(`No editor found for language: ${document.languageId}`);
							return;
						}

						// Load current docstring
						const currentDocstring = document.getText(docstringRange);
						editor.load(currentDocstring);

						// Replace TODO with AI-generated description
						// This is a bit tricky: we need to find the parameter line and replace TODO
						const updatedDocstring = currentDocstring.replace(
							new RegExp(`(${param.name}\\s*\\([^)]+\\):\\s*)TODO: Add description`, 'g'),
							`$1${result.description}`
						);

						// Apply the edit
						const workspaceEdit = new vscode.WorkspaceEdit();
						workspaceEdit.replace(documentUri, docstringRange, updatedDocstring);
						const success = await vscode.workspace.applyEdit(workspaceEdit);

						if (success) {
							logger.info(`Enhanced description for parameter '${param.name}'`);
						} else {
							logger.error('Failed to apply workspace edit');
						}

					} catch (error) {
						logger.error(`Error enhancing parameter description: ${error}`);
						vscode.window.showErrorMessage(
							`Error generating AI description: ${error instanceof Error ? error.message : String(error)}`
						);
					}
				}
			);
		}
	);

	context.subscriptions.push(command);
	logger.info('Registered enhance description command');
}
