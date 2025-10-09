/**
 * Return Analyzer for Python functions.
 * Validates that return type in code matches the one in docstring.
 */

import * as vscode from 'vscode';
import { IAnalyzer } from '../base';
import { FunctionDescriptor } from '../../parsers/types';
import { DocstringDescriptor } from '../../docstring/types';
import { DiagnosticFactory } from '../../diagnostics/factory';
import { Logger } from '../../utils/logger';
import { normalizeType } from './typeNormalizer';

/**
 * Analyzes function return types against docstrings (Python-specific)
 *
 * Checks:
 * - DSV201: Return type mismatch
 * - DSV202: Missing return in docstring (future)
 * - DSV203: Docstring says returns, but function is void (future)
 */
export class PythonReturnAnalyzer implements IAnalyzer {
	private logger: Logger;

	constructor() {
		this.logger = new Logger('Docstring Verifier - Python Return Analyzer');
	}

	/**
	 * Analyze function return type against docstring
	 */
	analyze(func: FunctionDescriptor, docstring: DocstringDescriptor): vscode.Diagnostic[] {
		const diagnostics: vscode.Diagnostic[] = [];
		const range = func.docstringRange || func.range;

		// Check for return type mismatch (DSV201)
		diagnostics.push(...this.checkReturnTypeMismatch(func, docstring, range));

		return diagnostics;
	}

	/**
	 * Check for return type mismatch (DSV201)
	 */
	private checkReturnTypeMismatch(
		func: FunctionDescriptor,
		docstring: DocstringDescriptor,
		range: vscode.Range
	): vscode.Diagnostic[] {
		const diagnostics: vscode.Diagnostic[] = [];

		// Only check if both code and docstring specify return type
		if (!func.returnType || !docstring.returns?.type) {
			return diagnostics;
		}

		// Normalize types for comparison
		const normalizedCodeType = normalizeType(func.returnType);
		const normalizedDocType = normalizeType(docstring.returns.type);

		if (normalizedCodeType !== normalizedDocType) {
			const diagnostic = DiagnosticFactory.createReturnTypeMismatch(
				func.name,
				func.returnType,
				docstring.returns.type,
				range
			);
			diagnostics.push(diagnostic);

			this.logger.debug(
				`DSV201: Return type mismatch in ${func.name}: ` +
				`code='${func.returnType}', doc='${docstring.returns.type}'`
			);
		}

		return diagnostics;
	}
}
