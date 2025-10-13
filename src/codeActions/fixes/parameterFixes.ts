/**
 * Fix provider for parameter-related diagnostics (DSV101-DSV104).
 */

import * as vscode from 'vscode';
import { Logger } from '../../utils/logger';
import { DiagnosticCode } from '../../diagnostics/types';
import { ICodeActionProvider, CodeActionContext } from '../types';
import { EditorHandlerRegistry } from '../../editors/registry';
import { ILLMService } from '../../llm';
import {
	findDocstringRange,
	extractParameterName,
	extractExpectedType,
	extractExpectedOptional
} from '../utils/docstringUtils';

/**
 * Provides fixes for parameter diagnostics.
 *
 * Supported diagnostics:
 * - DSV101: Parameter in docstring but not in code
 * - DSV102: Parameter in code but not in docstring
 * - DSV103: Parameter type mismatch
 * - DSV104: Optional/required mismatch
 */
export class ParameterFixProvider implements ICodeActionProvider {
	private logger: Logger;
	private editorRegistry: EditorHandlerRegistry;
	private llmService: ILLMService | undefined;

	constructor(editorRegistry: EditorHandlerRegistry, llmService?: ILLMService) {
		this.logger = new Logger('Docstring Verifier - Parameter Fix Provider');
		this.editorRegistry = editorRegistry;
		this.llmService = llmService;
	}

	/**
	 * Check if this provider can handle the diagnostic.
	 */
	canProvide(diagnostic: vscode.Diagnostic): boolean {
		const code = diagnostic.code?.toString();
		return (
			code === DiagnosticCode.PARAM_MISSING_IN_CODE ||
			code === DiagnosticCode.PARAM_MISSING_IN_DOCSTRING ||
			code === DiagnosticCode.PARAM_TYPE_MISMATCH ||
			code === DiagnosticCode.PARAM_OPTIONAL_MISMATCH
		);
	}

	/**
	 * Provide code actions for parameter diagnostics.
	 */
	provideCodeActions(context: CodeActionContext): vscode.CodeAction[] {
		const actions: vscode.CodeAction[] = [];
		const code = context.diagnostic.code?.toString();

		switch (code) {
			case DiagnosticCode.PARAM_MISSING_IN_DOCSTRING:
				actions.push(this.createAddParameterAction(context));
				break;

			case DiagnosticCode.PARAM_MISSING_IN_CODE:
				actions.push(this.createRemoveParameterAction(context));
				break;

			case DiagnosticCode.PARAM_TYPE_MISMATCH:
				actions.push(this.createFixTypeAction(context));
				break;

			case DiagnosticCode.PARAM_OPTIONAL_MISMATCH:
				actions.push(this.createFixOptionalAction(context));
				break;
		}

		return actions;
	}

	/**
	 * Create action to add missing parameter to docstring (DSV102).
	 */
	private createAddParameterAction(context: CodeActionContext): vscode.CodeAction {
		// Extract parameter name first for the action title
		const paramName = extractParameterName(context.diagnostic);

		const action = new vscode.CodeAction(
			paramName ? `Add parameter '${paramName}' to docstring` : 'Add missing parameter to docstring',
			vscode.CodeActionKind.QuickFix
		);

		action.diagnostics = [context.diagnostic];
		action.isPreferred = true;

		if (!paramName) {
			this.logger.warn('Could not extract parameter name from diagnostic');
			return action;
		}

		// Find the parameter in function descriptor
		const param = context.function.parameters.find(p => p.name === paramName);
		if (!param) {
			this.logger.warn(`Parameter '${paramName}' not found in function descriptor`);
			return action;
		}

		// Find docstring range
		const docstringRange = findDocstringRange(context.document, context.function);
		if (!docstringRange) {
			this.logger.warn('Could not find docstring range');
			return action;
		}

		// Get docstring text
		const docstringText = context.document.getText(docstringRange);

		// Get editor for the language
		const languageId = context.document.languageId;
		const editor = this.editorRegistry.getEditorAuto(languageId, docstringText);
		if (!editor) {
			this.logger.warn(`No editor found for language: ${languageId}`);
			return action;
		}

		// Phase 1: Create immediate Quick Fix with TODO placeholder
		// Use editor to add parameter
		editor.load(docstringText);
		editor.addParameter(param, undefined, context.function.parameters); // Pass all parameters for correct positioning
		const updatedDocstring = editor.getText();

		// Create workspace edit
		const edit = new vscode.WorkspaceEdit();
		edit.replace(context.document.uri, docstringRange, updatedDocstring);

		// Use command to apply edit and trigger save (which triggers re-analysis)
		// Also provide context for LLM enhancement
		const quickFixContext = {
			type: 'add-parameter' as const,
			parameterDetails: {
				functionDescriptor: context.function,
				parameterDescriptor: param,
				docstringRange: docstringRange,
			}
		};

		action.command = {
			command: 'docstring-verifier.applyQuickFix',
			title: 'Apply Quick Fix',
			arguments: [context.document.uri, edit, quickFixContext]
		};

		this.logger.info(`Created "Add parameter '${paramName}'" action`);

		return action;
	}

	/**
	 * Create action to remove extra parameter from docstring (DSV101).
	 */
	private createRemoveParameterAction(context: CodeActionContext): vscode.CodeAction {
		// Extract parameter name first for the action title
		const paramName = extractParameterName(context.diagnostic);

		const action = new vscode.CodeAction(
			paramName ? `Remove parameter '${paramName}' from docstring` : 'Remove parameter from docstring',
			vscode.CodeActionKind.QuickFix
		);

		action.diagnostics = [context.diagnostic];
		action.isPreferred = true;

		if (!paramName) {
			this.logger.warn('Could not extract parameter name from diagnostic');
			return action;
		}

		// Find docstring range
		const docstringRange = findDocstringRange(context.document, context.function);
		if (!docstringRange) {
			this.logger.warn('Could not find docstring range');
			return action;
		}

		// Get docstring text
		const docstringText = context.document.getText(docstringRange);

		// Get editor for the language
		const languageId = context.document.languageId;
		const editor = this.editorRegistry.getEditorAuto(languageId, docstringText);
		if (!editor) {
			this.logger.warn(`No editor found for language: ${languageId}`);
			return action;
		}

		// Use editor to remove parameter
		editor.load(docstringText);
		editor.removeParameter(paramName);
		const updatedDocstring = editor.getText();

		// Create workspace edit
		const edit = new vscode.WorkspaceEdit();
		edit.replace(context.document.uri, docstringRange, updatedDocstring);

		// Use command instead of direct edit to ensure re-analysis
		action.command = {
			command: 'docstring-verifier.applyQuickFix',
			title: 'Apply Quick Fix',
			arguments: [context.document.uri, edit]
		};

		this.logger.trace(`Created "Remove parameter '${paramName}'" action`);

		return action;
	}

	/**
	 * Create action to fix parameter type (DSV103).
	 */
	private createFixTypeAction(context: CodeActionContext): vscode.CodeAction {
		// Extract parameter name and type first for the action title
		const paramName = extractParameterName(context.diagnostic);
		const expectedType = extractExpectedType(context.diagnostic);

		const action = new vscode.CodeAction(
			paramName && expectedType
				? `Fix type of parameter '${paramName}' to '${expectedType}'`
				: 'Fix parameter type in docstring',
			vscode.CodeActionKind.QuickFix
		);

		action.diagnostics = [context.diagnostic];
		action.isPreferred = true;

		if (!paramName || !expectedType) {
			this.logger.warn('Could not extract parameter name or type from diagnostic');
			return action;
		}

		// Find docstring range
		const docstringRange = findDocstringRange(context.document, context.function);
		if (!docstringRange) {
			this.logger.warn('Could not find docstring range');
			return action;
		}

		// Get docstring text
		const docstringText = context.document.getText(docstringRange);

		// Get editor for the language
		const languageId = context.document.languageId;
		const editor = this.editorRegistry.getEditorAuto(languageId, docstringText);
		if (!editor) {
			this.logger.warn(`No editor found for language: ${languageId}`);
			return action;
		}

		// Use editor to update parameter type
		editor.load(docstringText);
		editor.updateParameterType(paramName, expectedType);
		const updatedDocstring = editor.getText();

		// Create workspace edit
		const edit = new vscode.WorkspaceEdit();
		edit.replace(context.document.uri, docstringRange, updatedDocstring);

		// Use command instead of direct edit to ensure re-analysis
		action.command = {
			command: 'docstring-verifier.applyQuickFix',
			title: 'Apply Quick Fix',
			arguments: [context.document.uri, edit]
		};

		this.logger.trace(`Created "Fix type for '${paramName}'" action`);

		return action;
	}

	/**
	 * Create action to fix optional/required mismatch (DSV104).
	 */
	private createFixOptionalAction(context: CodeActionContext): vscode.CodeAction {
		// Extract parameter name and optional status first for the action title
		const paramName = extractParameterName(context.diagnostic);
		const expectedOptional = extractExpectedOptional(context.diagnostic);

		const action = new vscode.CodeAction(
			paramName && expectedOptional !== null
				? `Mark parameter '${paramName}' as ${expectedOptional ? 'optional' : 'required'}`
				: 'Fix parameter optional/required status',
			vscode.CodeActionKind.QuickFix
		);

		action.diagnostics = [context.diagnostic];
		action.isPreferred = true;

		if (!paramName || expectedOptional === null) {
			this.logger.warn('Could not extract parameter name or optional status from diagnostic');
			return action;
		}

		// Find docstring range
		const docstringRange = findDocstringRange(context.document, context.function);
		if (!docstringRange) {
			this.logger.warn('Could not find docstring range');
			return action;
		}

		// Get docstring text
		const docstringText = context.document.getText(docstringRange);

		// Get editor for the language
		const languageId = context.document.languageId;
		const editor = this.editorRegistry.getEditorAuto(languageId, docstringText);
		if (!editor) {
			this.logger.warn(`No editor found for language: ${languageId}`);
			return action;
		}

		// Use editor to update parameter optional status
		editor.load(docstringText);
		editor.updateParameterOptional(paramName, expectedOptional);
		const updatedDocstring = editor.getText();

		// Create workspace edit
		const edit = new vscode.WorkspaceEdit();
		edit.replace(context.document.uri, docstringRange, updatedDocstring);

		// Use command instead of direct edit to ensure re-analysis
		action.command = {
			command: 'docstring-verifier.applyQuickFix',
			title: 'Apply Quick Fix',
			arguments: [context.document.uri, edit]
		};

		const status = expectedOptional ? 'optional' : 'required';
		this.logger.trace(`Created "Fix optional status for '${paramName}' to '${status}'" action`);

		return action;
	}
}
