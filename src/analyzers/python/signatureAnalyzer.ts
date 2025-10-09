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
import { normalizeType } from './typeNormalizer';

/**
 * Analyzes function signatures against docstrings (Python-specific)
 *
 * Checks:
 * - DSV101: Parameter in docstring but not in code
 * - DSV102: Parameter in code but not in docstring
 * - DSV103: Parameter type mismatch
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
	 *
	 * TODO (Post-MVP): Performance optimizations
	 * - Current complexity: O(n*m) for each check method = O(3nm) total
	 * - Use Map<string, Parameter> instead of find() for O(1) lookups
	 * - Combine three passes into single pass through parameters
	 * - Cache normalized types to avoid repeated regex operations
	 * - Extract regex patterns to static class fields (avoid recompilation)
	 *
	 * Current implementation is sufficient for MVP:
	 * - Typical function has 2-10 params → ~100 operations
	 * - Real bottleneck is Python subprocess parsing, not analysis
	 */
	analyze(func: FunctionDescriptor, docstring: DocstringDescriptor): vscode.Diagnostic[] {
		const diagnostics: vscode.Diagnostic[] = [];
		const range = func.docstringRange || func.range;

		// Check for parameters missing in docstring (DSV102)
		diagnostics.push(...this.checkMissingInDocstring(func, docstring, range));

		// Check for extra parameters in docstring (DSV101)
		diagnostics.push(...this.checkMissingInCode(func, docstring, range));

		// Check for parameter type mismatches (DSV103)
		diagnostics.push(...this.checkTypeMismatch(func, docstring, range));

		// Check for optional/required mismatches (DSV104)
		diagnostics.push(...this.checkOptionalMismatch(func, docstring, range));

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
	 * Check for parameter type mismatches (DSV103)
	 */
	private checkTypeMismatch(
		func: FunctionDescriptor,
		docstring: DocstringDescriptor,
		range: vscode.Range
	): vscode.Diagnostic[] {
		const diagnostics: vscode.Diagnostic[] = [];

		for (const codeParam of func.parameters) {
			// Skip implicit parameters
			if (this.isImplicitParam(codeParam.name)) {
				continue;
			}

			// Find corresponding docstring parameter
			const docParam = docstring.parameters.find(p => p.name === codeParam.name);
			if (!docParam) {
				// Already handled by DSV102
				continue;
			}

			// Compare types if both are present
			if (codeParam.type && docParam.type) {
				// Normalize types for comparison
				const normalizedCodeType = normalizeType(codeParam.type);
				const normalizedDocType = normalizeType(docParam.type);

				if (normalizedCodeType !== normalizedDocType) {
					const diagnostic = DiagnosticFactory.createParamTypeMismatch(
						codeParam.name,
						func.name,
						codeParam.type,
						docParam.type,
						range
					);
					diagnostics.push(diagnostic);

					this.logger.debug(
						`DSV103: Type mismatch for parameter '${codeParam.name}' in ${func.name}: ` +
						`code='${codeParam.type}', doc='${docParam.type}'`
					);
				}
			}
		}

		return diagnostics;
	}

	/**
	 * Check for optional/required parameter mismatches (DSV104)
	 */
	private checkOptionalMismatch(
		func: FunctionDescriptor,
		docstring: DocstringDescriptor,
		range: vscode.Range
	): vscode.Diagnostic[] {
		const diagnostics: vscode.Diagnostic[] = [];

		for (const codeParam of func.parameters) {
			// Skip implicit parameters
			if (this.isImplicitParam(codeParam.name)) {
				continue;
			}

			// Find corresponding docstring parameter
			const docParam = docstring.parameters.find(p => p.name === codeParam.name);
			if (!docParam) {
				// Already handled by DSV102
				continue;
			}

			// Check if optional status matches
			// In code: parameter is optional if it has a default value
			const isOptionalInCode = codeParam.isOptional;
			// In docstring: parameter is optional if explicitly marked as "optional"
			const isOptionalInDocstring = docParam.isOptional;

			// Only report mismatch if docstring explicitly specifies optional status
			// (avoid false positives when docstring doesn't mention optionality)
			if (docParam.isOptional !== undefined && isOptionalInCode !== isOptionalInDocstring) {
				const diagnostic = DiagnosticFactory.createParamOptionalMismatch(
					codeParam.name,
					func.name,
					isOptionalInCode,
					range
				);
				diagnostics.push(diagnostic);

				this.logger.debug(
					`DSV104: Optional mismatch for parameter '${codeParam.name}' in ${func.name}: ` +
					`code=${isOptionalInCode}, doc=${isOptionalInDocstring}`
				);
			}
		}

		return diagnostics;
	}

	/**
	 * Check if parameter name is implicit (self, cls in Python)
	 *
	 * TODO (Post-MVP): Consider handling *args and **kwargs
	 * - These variadic parameters are often documented differently in docstrings
	 * - May need special handling or user configuration option
	 */
	private isImplicitParam(name: string): boolean {
		return this.IMPLICIT_PARAMS.includes(name);
	}
}
