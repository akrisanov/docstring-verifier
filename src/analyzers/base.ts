/**
 * Base interface for all analyzers.
 * Analyzers validate specific aspects of code vs docstring.
 */

import * as vscode from 'vscode';
import { FunctionDescriptor } from '../parsers/types';
import { DocstringDescriptor } from '../docstring/types';

/**
 * Interface for analyzers that validate code against docstrings
 */
export interface IAnalyzer {
	/**
	 * Analyze a function and its docstring for mismatches
	 * @param func Function descriptor from code parser
	 * @param docstring Parsed docstring descriptor
	 * @param documentUri URI of the document being analyzed (for related information)
	 * @returns Array of diagnostics for found issues
	 */
	analyze(
		func: FunctionDescriptor,
		docstring: DocstringDescriptor,
		documentUri: vscode.Uri
	): vscode.Diagnostic[];
}
