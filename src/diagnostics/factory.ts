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
		range: vscode.Range,
		parameterLocation?: vscode.Location
	): vscode.Diagnostic {
		const diagnostic = new vscode.Diagnostic(
			range,
			`Parameter '${paramName}' is missing in docstring. Add it to the Args section.`,
			vscode.DiagnosticSeverity.Warning
		);
		diagnostic.code = DiagnosticCode.PARAM_MISSING_IN_DOCSTRING;
		diagnostic.source = DiagnosticFactory.SOURCE;

		if (parameterLocation) {
			diagnostic.relatedInformation = [
				new vscode.DiagnosticRelatedInformation(
					parameterLocation,
					`Parameter '${paramName}' is defined here in function signature`
				)
			];
		}

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
			`Parameter '${paramName}' is documented but not found in function '${functionName}'. Remove it from docstring or add to function signature.`,
			vscode.DiagnosticSeverity.Warning
		);
		diagnostic.code = DiagnosticCode.PARAM_MISSING_IN_CODE;
		diagnostic.source = DiagnosticFactory.SOURCE;
		return diagnostic;
	}

	/**
	 * Create diagnostic for parameter type mismatch (DSV103)
	 */
	static createParamTypeMismatch(
		paramName: string,
		functionName: string,
		codeType: string | null,
		docType: string | null,
		range: vscode.Range
	): vscode.Diagnostic {
		const codeTypeStr = codeType || 'no type hint';
		const docTypeStr = docType || 'no type';
		const diagnostic = new vscode.Diagnostic(
			range,
			`Parameter '${paramName}' type mismatch: code has '${codeTypeStr}', docstring has '${docTypeStr}'. Update docstring to match code.`,
			vscode.DiagnosticSeverity.Warning
		);
		diagnostic.code = DiagnosticCode.PARAM_TYPE_MISMATCH;
		diagnostic.source = DiagnosticFactory.SOURCE;
		return diagnostic;
	}

	/**
	 * Create diagnostic for parameter optional/required mismatch (DSV104)
	 */
	static createParamOptionalMismatch(
		paramName: string,
		functionName: string,
		isOptionalInCode: boolean,
		range: vscode.Range
	): vscode.Diagnostic {
		const codeStatus = isOptionalInCode ? 'optional (has default value)' : 'required';
		const docStatus = isOptionalInCode ? 'required' : 'optional';
		const diagnostic = new vscode.Diagnostic(
			range,
			`Parameter '${paramName}' is ${codeStatus} in code but marked as ${docStatus} in docstring for function '${functionName}'`,
			vscode.DiagnosticSeverity.Information
		);
		diagnostic.code = DiagnosticCode.PARAM_OPTIONAL_MISMATCH;
		diagnostic.source = DiagnosticFactory.SOURCE;
		return diagnostic;
	}

	/**
	 * Create diagnostic for return type mismatch (DSV201)
	 */
	static createReturnTypeMismatch(
		functionName: string,
		codeType: string,
		docType: string,
		range: vscode.Range
	): vscode.Diagnostic {
		const diagnostic = new vscode.Diagnostic(
			range,
			`Return type mismatch: code returns '${codeType}', docstring documents '${docType}'. Update Returns section to match code.`,
			vscode.DiagnosticSeverity.Warning
		);
		diagnostic.code = DiagnosticCode.RETURN_TYPE_MISMATCH;
		diagnostic.source = DiagnosticFactory.SOURCE;
		return diagnostic;
	}

	/**
	 * Create diagnostic for missing return in docstring (DSV202)
	 */
	static createReturnMissingInDocstring(
		functionName: string,
		returnType: string,
		range: vscode.Range,
		returnTypeLocation?: vscode.Location
	): vscode.Diagnostic {
		const diagnostic = new vscode.Diagnostic(
			range,
			`Function returns '${returnType}' but return is not documented. Add Returns section to docstring.`,
			vscode.DiagnosticSeverity.Warning
		);
		diagnostic.code = DiagnosticCode.RETURN_MISSING_IN_DOCSTRING;
		diagnostic.source = DiagnosticFactory.SOURCE;

		if (returnTypeLocation) {
			diagnostic.relatedInformation = [
				new vscode.DiagnosticRelatedInformation(
					returnTypeLocation,
					`Function '${functionName}' has return type: ${returnType}`
				)
			];
		}

		return diagnostic;
	}

	/**
	 * Create diagnostic for documented return but void function (DSV203)
	 */
	static createReturnDocumentedButVoid(
		functionName: string,
		docReturnType: string | null,
		range: vscode.Range
	): vscode.Diagnostic {
		const typeStr = docReturnType ? ` ('${docReturnType}')` : '';
		const diagnostic = new vscode.Diagnostic(
			range,
			`Function is void (no return) but docstring documents a return${typeStr}. Remove Returns section from docstring.`,
			vscode.DiagnosticSeverity.Warning
		);
		diagnostic.code = DiagnosticCode.RETURN_DOCUMENTED_BUT_VOID;
		diagnostic.source = DiagnosticFactory.SOURCE;
		return diagnostic;
	}

	/**
	 * Create diagnostic for multiple inconsistent return types (DSV204)
	 */
	static createMultipleInconsistentReturns(
		functionName: string,
		returnTypes: string[],
		range: vscode.Range
	): vscode.Diagnostic {
		const uniqueTypes = [...new Set(returnTypes)].join(', ');
		const diagnostic = new vscode.Diagnostic(
			range,
			`Function '${functionName}' has multiple inconsistent return types: ${uniqueTypes}. Consider documenting union type or refactoring.`,
			vscode.DiagnosticSeverity.Information
		);
		diagnostic.code = DiagnosticCode.RETURN_MULTIPLE_INCONSISTENT;
		diagnostic.source = DiagnosticFactory.SOURCE;
		return diagnostic;
	}

	/**
	 * Create diagnostic for generator that should use Yields instead of Returns (DSV205)
	 */
	static createGeneratorShouldYield(
		functionName: string,
		range: vscode.Range
	): vscode.Diagnostic {
		const diagnostic = new vscode.Diagnostic(
			range,
			`Generator function '${functionName}' should use 'Yields' section in docstring, not 'Returns'`,
			vscode.DiagnosticSeverity.Warning
		);
		diagnostic.code = DiagnosticCode.GENERATOR_SHOULD_YIELD;
		diagnostic.source = DiagnosticFactory.SOURCE;
		return diagnostic;
	}

	/**
	 * Create diagnostic for exception raised but not documented (DSV301)
	 */
	static createExceptionNotDocumented(
		exceptionType: string,
		functionName: string,
		range: vscode.Range,
		raiseLocation?: vscode.Location
	): vscode.Diagnostic {
		const diagnostic = new vscode.Diagnostic(
			range,
			`Exception '${exceptionType}' is raised but not documented. Add it to the Raises section.`,
			vscode.DiagnosticSeverity.Warning
		);
		diagnostic.code = DiagnosticCode.EXCEPTION_UNDOCUMENTED;
		diagnostic.source = DiagnosticFactory.SOURCE;

		if (raiseLocation) {
			diagnostic.relatedInformation = [
				new vscode.DiagnosticRelatedInformation(
					raiseLocation,
					`'${exceptionType}' is raised here`
				)
			];
		}

		return diagnostic;
	}

	/**
	 * Create diagnostic for exception documented but not raised (DSV302)
	 */
	static createExceptionNotRaised(
		exceptionType: string,
		functionName: string,
		range: vscode.Range
	): vscode.Diagnostic {
		const diagnostic = new vscode.Diagnostic(
			range,
			`Exception '${exceptionType}' is documented but not raised. Remove it from Raises section or add raise statement.`,
			vscode.DiagnosticSeverity.Information
		);
		diagnostic.code = DiagnosticCode.EXCEPTION_NOT_RAISED;
		diagnostic.source = DiagnosticFactory.SOURCE;
		return diagnostic;
	}

	/**
	 * Create diagnostic for undocumented side effects (DSV401)
	 */
	static createSideEffectUndocumented(
		functionName: string,
		sideEffectTypes: string[],
		range: vscode.Range
	): vscode.Diagnostic {
		const effectsStr = sideEffectTypes.join(' and ');
		const diagnostic = new vscode.Diagnostic(
			range,
			`Function '${functionName}' has side effects (${effectsStr}) that should be documented. Add a Note section describing the side effects.`,
			vscode.DiagnosticSeverity.Information
		);
		diagnostic.code = DiagnosticCode.SIDE_EFFECT_UNDOCUMENTED;
		diagnostic.source = DiagnosticFactory.SOURCE;
		return diagnostic;
	}
}
