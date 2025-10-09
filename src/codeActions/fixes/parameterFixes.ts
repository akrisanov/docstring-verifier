/**
 * Fix provider for parameter-related diagnostics (DSV101-DSV104).
 */

import * as vscode from 'vscode';
import { Logger } from '../../utils/logger';
import { DiagnosticCode } from '../../diagnostics/types';
import { ICodeActionProvider, CodeActionContext } from '../types';

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

	constructor() {
		this.logger = new Logger('Docstring Verifier - Parameter Fix Provider');
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
		const action = new vscode.CodeAction(
			'Add missing parameter to docstring',
			vscode.CodeActionKind.QuickFix
		);

		action.diagnostics = [context.diagnostic];
		action.isPreferred = true;

		// TODO: Implement the actual fix using WorkspaceEdit
		// For now, just create the action structure
		this.logger.trace('Created "Add missing parameter" action');

		return action;
	}

	/**
	 * Create action to remove extra parameter from docstring (DSV101).
	 */
	private createRemoveParameterAction(context: CodeActionContext): vscode.CodeAction {
		const action = new vscode.CodeAction(
			'Remove parameter from docstring',
			vscode.CodeActionKind.QuickFix
		);

		action.diagnostics = [context.diagnostic];
		action.isPreferred = true;

		// TODO: Implement the actual fix
		this.logger.trace('Created "Remove parameter" action');

		return action;
	}

	/**
	 * Create action to fix parameter type (DSV103).
	 */
	private createFixTypeAction(context: CodeActionContext): vscode.CodeAction {
		const action = new vscode.CodeAction(
			'Fix parameter type in docstring',
			vscode.CodeActionKind.QuickFix
		);

		action.diagnostics = [context.diagnostic];
		action.isPreferred = true;

		// TODO: Implement the actual fix
		this.logger.trace('Created "Fix parameter type" action');

		return action;
	}

	/**
	 * Create action to fix optional/required mismatch (DSV104).
	 */
	private createFixOptionalAction(context: CodeActionContext): vscode.CodeAction {
		const action = new vscode.CodeAction(
			'Fix parameter optional/required status',
			vscode.CodeActionKind.QuickFix
		);

		action.diagnostics = [context.diagnostic];
		action.isPreferred = true;

		// TODO: Implement the actual fix
		this.logger.trace('Created "Fix optional status" action');

		return action;
	}
}
