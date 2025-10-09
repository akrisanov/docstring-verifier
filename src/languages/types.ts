/**
 * Language handler types and interfaces.
 *
 * Each supported language (Python, TypeScript, JavaScript) implements the LanguageHandler interface.
 * This allows for language-agnostic document analysis in extension.ts.
 */

import * as vscode from 'vscode';
import { IParser } from '../parsers/base';
import { IDocstringParser } from '../docstring/base';
import { IAnalyzer } from '../analyzers/base';
import { FunctionDescriptor } from '../parsers/types';

/**
 * Language handler interface.
 * Each supported language implements this interface to provide:
 * - Code parsing (extracting function metadata)
 * - Docstring parsing (extracting documentation structure)
 * - Analysis (validating code vs documentation)
 */
export interface LanguageHandler {
	/** Parser for extracting function metadata from source code */
	parser: IParser;

	/** Map of docstring style name to parser (e.g., 'google' -> GoogleDocstringParser) */
	docstringParsers: Map<string, IDocstringParser>;

	/** Analyzers for validating code vs docstring */
	analyzers: IAnalyzer[];

	/**
	 * Select appropriate docstring parser based on document content.
	 * Optional - if not provided, uses first available parser.
	 *
	 * Example use cases:
	 * - Python: Auto-detect between Google and Sphinx styles
	 * - TypeScript: Always use JSDoc parser (no auto-detection needed)
	 *
	 * @param document The document being analyzed
	 * @param functions Functions extracted from the document
	 * @returns The docstring parser to use for this document
	 */
	selectDocstringParser?(
		document: vscode.TextDocument,
		functions: FunctionDescriptor[]
	): IDocstringParser;

	/**
	 * Reset any cached resources (e.g., Python executor cache, detected styles).
	 * Optional - called when relevant settings change.
	 */
	resetCache?(): void;
}
