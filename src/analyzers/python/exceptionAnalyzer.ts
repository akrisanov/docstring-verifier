import * as vscode from 'vscode';
import { IAnalyzer } from '../base';
import { FunctionDescriptor } from '../../parsers/types';
import { DocstringDescriptor } from '../../docstring/types';
import { DiagnosticFactory } from '../../diagnostics/factory';

/**
 * Analyzes exception handling consistency between code and docstrings.
 *
 * Validation Rules:
 * - DSV301: Exception raised in code but not documented in docstring
 * - DSV302: Exception documented in docstring but not raised in code
 */
export class PythonExceptionAnalyzer implements IAnalyzer {
	/**
	 * Analyze exception consistency for a function.
	 *
	 * @param func - Function metadata from code parser
	 * @param docstring - Parsed docstring information
	 * @returns Array of diagnostics for detected issues
	 */
	analyze(func: FunctionDescriptor, docstring: DocstringDescriptor): vscode.Diagnostic[] {
		const diagnostics: vscode.Diagnostic[] = [];

		// Skip analysis if function has no docstring
		if (!func.docstring || !func.docstringRange) {
			return diagnostics;
		}

		// Check for exceptions raised but not documented (DSV301)
		diagnostics.push(...this.checkMissingDocumentation(func, docstring));

		// Check for exceptions documented but not raised (DSV302)
		diagnostics.push(...this.checkMissingRaises(func, docstring));

		return diagnostics;
	}

	/**
	 * Check for exceptions raised in code but not documented (DSV301).
	 *
	 * @param func - Function metadata
	 * @param docstring - Parsed docstring
	 * @returns Diagnostics for undocumented exceptions
	 */
	private checkMissingDocumentation(
		func: FunctionDescriptor,
		docstring: DocstringDescriptor
	): vscode.Diagnostic[] {
		const diagnostics: vscode.Diagnostic[] = [];

		// Get normalized exception types from docstring
		const documentedTypes = new Set(
			docstring.raises.map(r => this.normalizeExceptionType(r.type))
		);

		// Check each raised exception
		for (const raisedException of func.raises) {
			const normalizedType = this.normalizeExceptionType(raisedException.type);

			// Skip if exception is documented
			if (documentedTypes.has(normalizedType)) {
				continue;
			}

			// Create diagnostic at the raise statement location
			const line = raisedException.line - 1; // Convert to 0-based
			const range = new vscode.Range(line, 0, line, Number.MAX_SAFE_INTEGER);

			diagnostics.push(
				DiagnosticFactory.createExceptionNotDocumented(
					raisedException.type,
					func.name,
					range
				)
			);
		}

		return diagnostics;
	}

	/**
	 * Check for exceptions documented but not raised (DSV302).
	 *
	 * @param func - Function metadata
	 * @param docstring - Parsed docstring
	 * @returns Diagnostics for incorrectly documented exceptions
	 */
	private checkMissingRaises(
		func: FunctionDescriptor,
		docstring: DocstringDescriptor
	): vscode.Diagnostic[] {
		const diagnostics: vscode.Diagnostic[] = [];

		// No documented exceptions - nothing to check
		if (docstring.raises.length === 0) {
			return diagnostics;
		}

		// Get normalized exception types from code
		const raisedTypes = new Set(
			func.raises.map(r => this.normalizeExceptionType(r.type))
		);

		// Check each documented exception
		for (const documentedException of docstring.raises) {
			const normalizedType = this.normalizeExceptionType(documentedException.type);

			// Skip if exception is actually raised
			if (raisedTypes.has(normalizedType)) {
				continue;
			}

			// Create diagnostic at the docstring location
			// Use docstringRange as we don't have exact Raises section location
			diagnostics.push(
				DiagnosticFactory.createExceptionNotRaised(
					documentedException.type,
					func.name,
					func.docstringRange!
				)
			);
		}

		return diagnostics;
	}

	/**
	 * Normalize exception type for comparison.
	 * Handles common variations and aliases.
	 *
	 * @param exceptionType - Raw exception type string
	 * @returns Normalized type string
	 */
	private normalizeExceptionType(exceptionType: string): string {
		// Remove whitespace
		let normalized = exceptionType.trim();

		// Remove common prefixes (e.g., "builtins.ValueError" -> "ValueError")
		normalized = normalized.replace(/^builtins\./, '');

		// Handle case variations (ValueError, valueerror, VALUEERROR -> ValueError)
		// Keep the original case but make comparison case-insensitive
		return normalized.toLowerCase();
	}
}
