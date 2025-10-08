/**
 * Google-style docstring parser
 *
 * Parses docstrings in Google format:
 *
 * Args:
 *     param_name (type): Description
 *
 * Returns:
 *     type: Description
 *
 * Raises:
 *     ExceptionType: Description
 *
 * Note:
 *     Additional notes
 */

import {
	DocstringDescriptor,
	DocstringParameterDescriptor,
	DocstringReturnDescriptor,
	DocstringExceptionDescriptor,
} from '../types';
import { IDocstringParser } from '../base';

/**
 * Parse Google-style docstring into structured format
 */
export class GoogleDocstringParser implements IDocstringParser {
	/**
	 * Parse a Google-style docstring
	 * @param docstring The docstring text to parse
	 * @returns Parsed docstring descriptor
	 */
	parse(docstring: string): DocstringDescriptor {
		if (!docstring || docstring.trim() === '') {
			return this.emptyDescriptor();
		}

		const sections = this.splitIntoSections(docstring);

		return {
			parameters: this.parseParameters(sections.args || ''),
			returns: this.parseReturns(sections.returns || ''),
			raises: this.parseRaises(sections.raises || ''),
			notes: sections.note || null,
		};
	}

	/**
	 * Create empty descriptor
	 */
	private emptyDescriptor(): DocstringDescriptor {
		return {
			parameters: [],
			returns: null,
			raises: [],
			notes: null,
		};
	}

	/**
	 * Split docstring into sections (Args, Returns, Raises, Note)
	 */
	private splitIntoSections(docstring: string): Record<string, string> {
		const sections: Record<string, string> = {};
		const lines = docstring.split('\n');

		let currentSection: string | null = null;
		let currentContent: string[] = [];

		// Section headers we're looking for (case-insensitive)
		const sectionHeaders = /^(Args?|Arguments?|Parameters?|Params?|Returns?|Return|Yields?|Yield|Raises?|Raise|Throws?|Note|Notes?|Examples?|Example):\s*$/i;

		for (const line of lines) {
			const trimmed = line.trim();
			const match = trimmed.match(sectionHeaders);

			if (match) {
				// Save previous section
				if (currentSection) {
					sections[currentSection] = currentContent.join('\n').trim();
				}

				// Start new section
				const header = match[1].toLowerCase();
				// Normalize section names
				if (['args', 'arguments', 'parameters', 'params'].includes(header)) {
					currentSection = 'args';
				} else if (['returns', 'return'].includes(header)) {
					currentSection = 'returns';
				} else if (['yields', 'yield'].includes(header)) {
					currentSection = 'yields';
				} else if (['raises', 'raise', 'throws'].includes(header)) {
					currentSection = 'raises';
				} else if (['note', 'notes'].includes(header)) {
					currentSection = 'note';
				} else if (['examples', 'example'].includes(header)) {
					currentSection = 'examples';
				} else {
					currentSection = header;
				}

				currentContent = [];
			} else if (currentSection) {
				// Add line to current section (preserve indentation for parsing)
				currentContent.push(line);
			}
		}

		// Save last section
		if (currentSection) {
			sections[currentSection] = currentContent.join('\n').trim();
		}

		return sections;
	}

	/**
	 * Parse Args section
	 * Format: param_name (type): Description
	 * or: param_name: Description
	 */
	private parseParameters(argsSection: string): DocstringParameterDescriptor[] {
		if (!argsSection || argsSection.trim() === '') {
			return [];
		}

		const parameters: DocstringParameterDescriptor[] = [];
		const lines = argsSection.split('\n');

		let currentParam: DocstringParameterDescriptor | null = null;

		for (const line of lines) {
			// Match parameter line: "param_name (type): Description"
			// or "param_name: Description"
			const paramMatch = line.match(/^\s*(\w+)\s*(?:\(([^)]+)\))?\s*:\s*(.*)$/);

			if (paramMatch) {
				// Save previous parameter
				if (currentParam) {
					parameters.push(currentParam);
				}

				// Start new parameter
				const [, name, type, description] = paramMatch;
				currentParam = {
					name: name.trim(),
					type: type ? type.trim() : null,
					description: description.trim(),
				};
			} else if (currentParam && line.trim()) {
				// Continuation of description (indented)
				currentParam.description += ' ' + line.trim();
			}
		}

		// Save last parameter
		if (currentParam) {
			parameters.push(currentParam);
		}

		return parameters;
	}

	/**
	 * Parse Returns section
	 * Format: type: Description
	 * or: Description (type inferred as None)
	 */
	private parseReturns(returnsSection: string): DocstringReturnDescriptor | null {
		if (!returnsSection || returnsSection.trim() === '') {
			return null;
		}

		const trimmed = returnsSection.trim();
		const lines = trimmed.split('\n');
		const firstLine = lines[0].trim();

		// Try to match "type: Description" on first line
		// Type should look like a type identifier (word, optional dots/brackets, max ~50 chars)
		const typeMatch = firstLine.match(/^([\w\[\].,\s]+?):\s*(.*)$/);

		if (typeMatch) {
			const [, potentialType, restOfFirstLine] = typeMatch;
			const type = potentialType.trim();

			// Check if it looks like a type (short, type-like pattern)
			// Types are usually short: int, str, dict, List[str], Optional[int], etc.
			// If longer than 50 chars or contains verb-like words, it's probably a description
			if (type.length <= 50 && !this.looksLikeDescription(type)) {
				// Collect full description (rest of first line + remaining lines)
				const descriptionParts = [restOfFirstLine.trim()];
				if (lines.length > 1) {
					descriptionParts.push(lines.slice(1).join('\n').trim());
				}
				const description = descriptionParts.filter(p => p).join(' ');

				return {
					type: type,
					description: description || '',
				};
			}
		}

		// No type specified, treat entire section as description
		return {
			type: null,
			description: trimmed,
		};
	}

	/**
	 * Check if a string looks like a description rather than a type
	 * Descriptions typically contain articles, verbs, or long phrases
	 */
	private looksLikeDescription(text: string): boolean {
		const lower = text.toLowerCase();
		// Common words that indicate description, not type
		const descriptionIndicators = [
			'the ', 'a ', 'an ', 'this ', 'that ', 'returns ', 'return ',
			'provides ', 'contains ', 'is ', 'are ', 'will ', 'should ',
			'with ', 'for ', 'from ', 'to ', 'of ',
		];
		return descriptionIndicators.some(indicator => lower.includes(indicator));
	}

	/**
	 * Parse Raises section
	 * Format: ExceptionType: Description
	 */
	private parseRaises(raisesSection: string): DocstringExceptionDescriptor[] {
		if (!raisesSection || raisesSection.trim() === '') {
			return [];
		}

		const exceptions: DocstringExceptionDescriptor[] = [];
		const lines = raisesSection.split('\n');

		let currentException: DocstringExceptionDescriptor | null = null;

		for (const line of lines) {
			// Match exception line: "ExceptionType: Description"
			const exceptionMatch = line.match(/^\s*(\w+(?:\.\w+)*)\s*:\s*(.*)$/);

			if (exceptionMatch) {
				// Save previous exception
				if (currentException) {
					exceptions.push(currentException);
				}

				// Start new exception
				const [, type, description] = exceptionMatch;
				currentException = {
					type: type.trim(),
					description: description.trim(),
				};
			} else if (currentException && line.trim()) {
				// Continuation of description (indented)
				currentException.description += ' ' + line.trim();
			}
		}

		// Save last exception
		if (currentException) {
			exceptions.push(currentException);
		}

		return exceptions;
	}
}
