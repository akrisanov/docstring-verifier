/**
 * Signature Analyzer for Python functions.
 * Validates that parameters in code match those in docstring.
 */

import * as vscode from 'vscode';
import { IAnalyzer } from '../base';
import { FunctionDescriptor } from '../../parsers/types';
import { DocstringDescriptor } from '../../docstring/types';
import { DiagnosticFactory } from '../../diagnostics/factory';
import { Logger } from '../../utils/logger';

/**
 * Analyzes function signatures against docstrings (Python-specific)
 *
 * Checks:
 * - DSV101: Parameter in docstring but not in code
 * - DSV102: Parameter in code but not in docstring
 * - DSV103: Parameter type mismatch (future)
 * - DSV104: Optional/required mismatch (future)
 */
export class PythonSignatureAnalyzer implements IAnalyzer {
	private logger: Logger;
	private readonly IMPLICIT_PARAMS = ['self', 'cls'];

	constructor() {
		this.logger = new Logger('Docstring Verifier - Python Signature Analyzer');
	}

	/**
	 * Analyze function signature against docstring
	 */
	analyze(func: FunctionDescriptor, docstring: DocstringDescriptor): vscode.Diagnostic[] {
		const diagnostics: vscode.Diagnostic[] = [];
		const range = func.docstringRange || func.range;

		// Check for parameters missing in docstring (DSV102)
		diagnostics.push(...this.checkMissingInDocstring(func, docstring, range));

		// Check for extra parameters in docstring (DSV101)
		diagnostics.push(...this.checkMissingInCode(func, docstring, range));

		return diagnostics;
	}

	/**
	 * Check for parameters in code but missing in docstring (DSV102)
	 */
	private checkMissingInDocstring(
		func: FunctionDescriptor,
		docstring: DocstringDescriptor,
		range: vscode.Range
	): vscode.Diagnostic[] {
		const diagnostics: vscode.Diagnostic[] = [];

		for (const codeParam of func.parameters) {
			// Skip implicit parameters (self, cls)
			if (this.isImplicitParam(codeParam.name)) {
				continue;
			}

			// Check if parameter is documented
			const docParam = docstring.parameters.find(p => p.name === codeParam.name);
			if (!docParam) {
				const diagnostic = DiagnosticFactory.createParamMissingInDocstring(
					codeParam.name,
					func.name,
					range
				);
				diagnostics.push(diagnostic);

				this.logger.debug(`DSV102: Parameter '${codeParam.name}' missing in docstring of ${func.name}`);
			}
		}

		return diagnostics;
	}

	/**
	 * Check for parameters in docstring but not in code (DSV101)
	 */
	private checkMissingInCode(
		func: FunctionDescriptor,
		docstring: DocstringDescriptor,
		range: vscode.Range
	): vscode.Diagnostic[] {
		const diagnostics: vscode.Diagnostic[] = [];

		for (const docParam of docstring.parameters) {
			// Skip implicit parameters (even if documented)
			if (this.isImplicitParam(docParam.name)) {
				continue;
			}

			// Check if parameter exists in code
			const codeParam = func.parameters.find(p => p.name === docParam.name);
			if (!codeParam) {
				const diagnostic = DiagnosticFactory.createParamMissingInCode(
					docParam.name,
					func.name,
					range
				);
				diagnostics.push(diagnostic);

				this.logger.debug(`DSV101: Parameter '${docParam.name}' documented but not in code of ${func.name}`);
			}
		}

		return diagnostics;
	}

	/**
	 * Check if parameter name is implicit (self, cls in Python)
	 */
	private isImplicitParam(name: string): boolean {
		return this.IMPLICIT_PARAMS.includes(name);
	}
}
