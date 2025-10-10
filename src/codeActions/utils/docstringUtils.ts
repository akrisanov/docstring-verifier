/**
 * Utility functions for working with docstrings in code actions.
 */

import * as vscode from 'vscode';
import { FunctionDescriptor } from '../../parsers/types';

/**
 * Find the docstring range for a function.
 * Returns the range of the docstring text (including quotes).
 */
export function findDocstringRange(
	document: vscode.TextDocument,
	func: FunctionDescriptor
): vscode.Range | null {
	if (!func.docstring) {
		return null;
	}

	// Docstring is stored in function descriptor with its range
	// We need to find the actual text in the document
	const funcStartLine = func.range.start.line;

	// Search for docstring starting from the line after function definition
	// Typically: def foo(): \n    """docstring"""
	for (let i = funcStartLine; i < Math.min(funcStartLine + 10, document.lineCount); i++) {
		const line = document.lineAt(i);
		const text = line.text;

		// Look for opening quotes (""" or ''')
		const tripleQuoteMatch = text.match(/("""|''')/);
		if (tripleQuoteMatch) {
			const startPos = new vscode.Position(i, tripleQuoteMatch.index!);

			// Find closing quotes
			let endLine = i;
			let endChar = text.indexOf(tripleQuoteMatch[1], tripleQuoteMatch.index! + 3);

			if (endChar === -1) {
				// Multi-line docstring - search for closing quotes
				for (let j = i + 1; j < document.lineCount; j++) {
					const nextLine = document.lineAt(j).text;
					const closingIndex = nextLine.indexOf(tripleQuoteMatch[1]);
					if (closingIndex !== -1) {
						endLine = j;
						endChar = closingIndex + 3; // Include the closing quotes
						break;
					}
				}
			} else {
				endChar += 3; // Include the closing quotes
			}

			if (endChar !== -1) {
				return new vscode.Range(startPos, new vscode.Position(endLine, endChar));
			}
		}
	}

	return null;
}

/**
 * Extract parameter name from diagnostic message.
 *
 * Diagnostic messages follow patterns like:
 * - "Parameter 'x' is missing in docstring"
 * - "Parameter 'y' is documented but not in function signature"
 * - "Parameter 'z' type mismatch"
 */
export function extractParameterName(diagnostic: vscode.Diagnostic): string | null {
	const message = diagnostic.message;

	// Match "Parameter 'name'" or "parameter 'name'"
	const match = message.match(/[Pp]arameter '(\w+)'/);
	if (match) {
		return match[1];
	}

	return null;
}

/**
 * Extract type information from diagnostic message.
 *
 * For DSV103, message is: "Parameter 'x' type mismatch: code has 'int', docstring has 'str'"
 */
export function extractExpectedType(diagnostic: vscode.Diagnostic): string | null {
	const message = diagnostic.message;

	// Match "code has 'type'" - this is the expected type from code
	const match = message.match(/code has '([^']+)'/);
	if (match) {
		return match[1];
	}

	return null;
}/**
 * Extract optional status from diagnostic message.
 *
 * For DSV104, message is: "Parameter 'x' is optional (has default value) in code but marked as required in docstring"
 * or "Parameter 'x' is required in code but marked as optional in docstring"
 */
export function extractExpectedOptional(diagnostic: vscode.Diagnostic): boolean | null {
	const message = diagnostic.message;

	// Check if parameter should be optional (is optional in code but required in doc)
	if (message.includes('optional (has default value) in code')) {
		return true;
	}
	// Check if parameter should be required (is required in code but optional in doc)
	if (message.includes('required in code')) {
		return false;
	}

	return null;
}
