import * as vscode from 'vscode';
import { IAnalyzer } from '../base';
import { FunctionDescriptor } from '../../parsers/types';
import { DocstringDescriptor } from '../../docstring/types';
import { DiagnosticFactory } from '../../diagnostics/factory';

/**
 * Analyzes side effects consistency between code and docstrings.
 *
 * Validation Rules:
 * - DSV401: Side effects detected but not documented
 *
 * Currently detected side effects:
 * - File I/O operations (open, read, write, print, input)
 * - Global/nonlocal variable modifications
 *
 * Note: Database operations and network requests are not currently detected
 * by the AST extractor (would require more sophisticated analysis).
 */
export class PythonSideEffectsAnalyzer implements IAnalyzer {
	/**
	 * Analyze side effects consistency for a function.
	 *
	 * @param func - Function metadata from code parser
	 * @param docstring - Parsed docstring information
	 * @param documentUri - URI of the document being analyzed (unused)
	 * @returns Array of diagnostics for detected issues
	 */
	analyze(
		func: FunctionDescriptor,
		docstring: DocstringDescriptor,
		documentUri: vscode.Uri
	): vscode.Diagnostic[] {
		const diagnostics: vscode.Diagnostic[] = [];

		// Skip analysis if function has no docstring
		if (!func.docstring || !func.docstringRange) {
			return diagnostics;
		}

		// Check for side effects
		const hasSideEffects = func.hasIO || func.hasGlobalMods;

		if (!hasSideEffects) {
			return diagnostics;
		}

		// Check if side effects are documented
		const hasSideEffectsNote = this.checkSideEffectsDocumented(docstring);

		if (!hasSideEffectsNote) {
			// Determine which side effects are present
			const sideEffectTypes: string[] = [];
			if (func.hasIO) {
				sideEffectTypes.push('I/O operations');
			}
			if (func.hasGlobalMods) {
				sideEffectTypes.push('global/nonlocal variable modifications');
			}

			diagnostics.push(
				DiagnosticFactory.createSideEffectUndocumented(
					func.name,
					sideEffectTypes,
					func.docstringRange
				)
			);
		}

		return diagnostics;
	}

	/**
	 * Check if side effects are documented in the docstring.
	 *
	 * Looks for common patterns in docstring notes:
	 * - "side effect"
	 * - "modifies"
	 * - "writes to"
	 * - "prints"
	 * - "global"
	 * - "file"
	 * - "I/O"
	 *
	 * @param docstring - Parsed docstring
	 * @returns True if side effects appear to be documented
	 */
	private checkSideEffectsDocumented(docstring: DocstringDescriptor): boolean {
		// Check in Note sections
		const notes = (docstring.notes || '').toLowerCase();

		// Side effect indicators
		const indicators = [
			'side effect',
			'modifies',
			'writes to',
			'prints',
			'global',
			'file',
			'i/o',
			'input/output',
			'saves',
			'creates file',
			'deletes file',
		];

		return indicators.some(indicator => notes.includes(indicator));
	}
}
