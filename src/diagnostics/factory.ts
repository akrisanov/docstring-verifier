/**
 * Factory for creating VS Code diagnostics from mismatches.
 * Centralizes diagnostic creation for consistent formatting.
 */

import * as vscode from 'vscode';
import { DiagnosticCode, Mismatch } from './types';

/**
 * Factory class for creating diagnostics
 */
export class DiagnosticFactory {
	private static readonly SOURCE = 'docstring-verifier';

	/**
	 * Create a diagnostic from a mismatch
	 */
	static createFromMismatch(mismatch: Mismatch): vscode.Diagnostic {
		const diagnostic = new vscode.Diagnostic(
			mismatch.range,
			mismatch.message,
			mismatch.severity
		);
		diagnostic.code = mismatch.code;
		diagnostic.source = DiagnosticFactory.SOURCE;
		return diagnostic;
	}

	/**
	 * Create diagnostic for parameter missing in docstring (DSV102)
	 */
	static createParamMissingInDocstring(
		paramName: string,
		functionName: string,
		range: vscode.Range
	): vscode.Diagnostic {
		const diagnostic = new vscode.Diagnostic(
			range,
			`Parameter '${paramName}' is missing in docstring for function '${functionName}'`,
			vscode.DiagnosticSeverity.Warning
		);
		diagnostic.code = DiagnosticCode.PARAM_MISSING_IN_DOCSTRING;
		diagnostic.source = DiagnosticFactory.SOURCE;
		return diagnostic;
	}

	/**
	 * Create diagnostic for parameter documented but not in code (DSV101)
	 */
	static createParamMissingInCode(
		paramName: string,
		functionName: string,
		range: vscode.Range
	): vscode.Diagnostic {
		const diagnostic = new vscode.Diagnostic(
			range,
			`Parameter '${paramName}' is documented but not found in function '${functionName}'`,
			vscode.DiagnosticSeverity.Warning
		);
		diagnostic.code = DiagnosticCode.PARAM_MISSING_IN_CODE;
		diagnostic.source = DiagnosticFactory.SOURCE;
		return diagnostic;
	}
}
