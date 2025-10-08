/**
 * Base interface for all docstring parsers.
 * Docstring parsers extract structured information from documentation strings.
 */

import { DocstringDescriptor } from './types';

/**
 * Interface for parsing docstrings in various formats (Google, Sphinx, JSDoc, etc.)
 */
export interface IDocstringParser {
	/**
	 * Parse a docstring and extract structured information
	 * @param docstring The docstring text to parse
	 * @returns Parsed docstring descriptor with parameters, returns, raises, and notes
	 */
	parse(docstring: string): DocstringDescriptor;
}
