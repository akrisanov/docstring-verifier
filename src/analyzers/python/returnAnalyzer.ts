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
 * - DSV202: Missing return in docstring
 * - DSV203: Docstring says returns, but function is void
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

		// Check for missing return in docstring (DSV202)
		diagnostics.push(...this.checkReturnMissingInDocstring(func, docstring, range));

		// Check for documented return but void function (DSV203)
		diagnostics.push(...this.checkReturnDocumentedButVoid(func, docstring, range));

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

	/**
	 * Check for missing return in docstring (DSV202)
	 *
	 * Reports when function has a return type in code but no Returns section in docstring.
	 * Skip if:
	 * - Function has no return type
	 * - Return type is None (void function)
	 */
	private checkReturnMissingInDocstring(
		func: FunctionDescriptor,
		docstring: DocstringDescriptor,
		range: vscode.Range
	): vscode.Diagnostic[] {
		const diagnostics: vscode.Diagnostic[] = [];

		// Skip if function has no return type or returns None
		if (!func.returnType || func.returnType.toLowerCase() === 'none') {
			return diagnostics;
		}

		// Skip if docstring has a returns section
		if (docstring.returns) {
			return diagnostics;
		}

		// Function has a return type but no Returns section in docstring
		const diagnostic = DiagnosticFactory.createReturnMissingInDocstring(
			func.name,
			func.returnType,
			range
		);
		diagnostics.push(diagnostic);

		this.logger.debug(
			`DSV202: Missing return in docstring for ${func.name}: ` +
			`code returns '${func.returnType}' but no Returns section in docstring`
		);

		return diagnostics;
	}

	/**
	 * Check for documented return but void function (DSV203)
	 *
	 * Reports when function has no return type (or returns None) but docstring has Returns section.
	 * Skip if:
	 * - Docstring has no returns section
	 * - Function has a non-None return type
	 */
	private checkReturnDocumentedButVoid(
		func: FunctionDescriptor,
		docstring: DocstringDescriptor,
		range: vscode.Range
	): vscode.Diagnostic[] {
		const diagnostics: vscode.Diagnostic[] = [];

		// Skip if docstring has no returns section
		if (!docstring.returns) {
			return diagnostics;
		}

		// Skip if function has a non-None return type
		if (func.returnType && func.returnType.toLowerCase() !== 'none') {
			return diagnostics;
		}

		// Function is void (no return type or returns None) but docstring has Returns section
		const diagnostic = DiagnosticFactory.createReturnDocumentedButVoid(
			func.name,
			docstring.returns.type,
			range
		);
		diagnostics.push(diagnostic);

		this.logger.debug(
			`DSV203: Documented return but void function for ${func.name}: ` +
			`function has no return type but docstring has Returns section`
		);

		return diagnostics;
	}
}
