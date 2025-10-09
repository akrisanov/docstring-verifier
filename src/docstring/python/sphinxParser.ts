/**
 * Sphinx-style docstring parser
 *
 * Parses docstrings in Sphinx/reStructuredText format:
 *
 * :param param_name: Description
 * :type param_name: type
 * :returns: Description
 * :rtype: type
 * :raises ExceptionType: Description
 *
 * Supported directives:
 * - :param name: / :parameter name: - Parameter description
 * - :type name: - Parameter type
 * - :returns: / :return: - Return value description
 * - :rtype: - Return type
 * - :raises Exception: / :raise Exception: - Exception description
 * - :yields: / :yield: - Generator yields description
 * - :ytype: - Yield type
 */

import {
	DocstringDescriptor,
	DocstringParameterDescriptor,
	DocstringReturnDescriptor,
	DocstringExceptionDescriptor,
} from '../types';
import { IDocstringParser } from '../base';

/**
 * Internal type for storing directive information
 */
interface DirectiveInfo {
	type: string;
	argument: string | null;
	description: string;
}

/**
 * Parse Sphinx-style docstring into structured format
 */
export class SphinxDocstringParser implements IDocstringParser {
	/**
	 * Regular expression for matching Sphinx directives
	 * Format: :directive: or :directive argument:
	 * Captures: (directiveType, argument, description)
	 */
	private static readonly DIRECTIVE_PATTERN = /^:(\w+)(?:\s+([^:]+))?:\s*(.*)$/;

	/**
	 * Map of alternative directive names to canonical names
	 */
	private static readonly DIRECTIVE_ALIASES = new Map<string, string>([
		['parameter', 'param'],
		['return', 'returns'],
		['raise', 'raises'],
		['yield', 'yields'],
		['notes', 'note'],
	]);
	/**
	 * Parse a Sphinx-style docstring
	 * @param docstring The docstring text to parse
	 * @returns Parsed docstring descriptor
	 */
	parse(docstring: string): DocstringDescriptor {
		if (!docstring || docstring.trim() === '') {
			return this.emptyDescriptor();
		}

		const lines = docstring.split('\n');
		const directives = this.extractDirectives(lines);

		return {
			parameters: this.parseParameters(directives),
			returns: this.parseReturns(directives),
			raises: this.parseRaises(directives),
			notes: this.parseNotes(directives),
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
	 * Extract all reStructuredText directives from docstring
	 * Returns a map of directive type to array of directive info
	 */
	private extractDirectives(lines: string[]): Map<string, DirectiveInfo[]> {
		const directives = new Map<string, DirectiveInfo[]>();
		let currentDirective: DirectiveInfo | null = null;

		for (const line of lines) {
			const trimmed = line.trim();
			const directiveMatch = trimmed.match(SphinxDocstringParser.DIRECTIVE_PATTERN);

			if (directiveMatch) {
				// Save previous directive
				if (currentDirective) {
					this.addDirective(directives, currentDirective);
				}

				// Start new directive
				const [, directiveType, argument, description] = directiveMatch;
				currentDirective = {
					type: this.normalizeDirectiveType(directiveType),
					argument: argument?.trim() || null,
					description: description.trim(),
				};
			} else if (currentDirective && trimmed && !trimmed.startsWith(':')) {
				// Continuation of previous directive description
				currentDirective.description += ' ' + trimmed;
			}
		}

		// Save last directive
		if (currentDirective) {
			this.addDirective(directives, currentDirective);
		}

		return directives;
	}

	/**
	 * Normalize directive type using aliases map
	 * Example: 'parameter' -> 'param', 'return' -> 'returns'
	 */
	private normalizeDirectiveType(type: string): string {
		const lowerType = type.toLowerCase();
		return SphinxDocstringParser.DIRECTIVE_ALIASES.get(lowerType) || lowerType;
	}

	/**
	 * Add directive to the map
	 */
	private addDirective(map: Map<string, DirectiveInfo[]>, directive: DirectiveInfo): void {
		const key = directive.type;
		if (!map.has(key)) {
			map.set(key, []);
		}
		map.get(key)!.push(directive);
	}

	/**
	 * Parse parameters from directives
	 * Combines :param name: and :type name: directives
	 */
	private parseParameters(directives: Map<string, DirectiveInfo[]>): DocstringParameterDescriptor[] {
		const paramMap = new Map<string, DocstringParameterDescriptor>();

		// Process :param directives (aliases already normalized)
		const paramDirectives = directives.get('param') || [];
		for (const directive of paramDirectives) {
			if (directive.argument) {
				paramMap.set(directive.argument, {
					name: directive.argument,
					type: null,
					description: directive.description,
					isOptional: undefined,
				});
			}
		}

		// Process :type directives and merge with parameters
		const typeDirectives = directives.get('type') || [];
		for (const directive of typeDirectives) {
			if (!directive.argument) {
				continue;
			}

			const { isOptional, cleanType } = this.parseTypeString(directive.description);

			if (paramMap.has(directive.argument)) {
				// Merge with existing param
				const param = paramMap.get(directive.argument)!;
				param.type = cleanType;
				if (isOptional) {
					param.isOptional = true;
				}
			} else {
				// Type without corresponding param - create new entry
				paramMap.set(directive.argument, {
					name: directive.argument,
					type: cleanType,
					description: '',
					isOptional: isOptional ? true : undefined,
				});
			}
		}

		return Array.from(paramMap.values());
	}

	/**
	 * Parse return value from directives
	 * Combines :returns: and :rtype: directives
	 */
	private parseReturns(directives: Map<string, DirectiveInfo[]>): DocstringReturnDescriptor | null {
		const returnDirectives = directives.get('returns') || [];
		const rtypeDirectives = directives.get('rtype') || [];

		const description = returnDirectives[0]?.description || '';
		const type = rtypeDirectives[0]?.description.trim() || null;

		// Return null if no return information found
		if (!description && !type) {
			return null;
		}

		return { type, description };
	}

	/**
	 * Parse exceptions from directives
	 * Uses :raises: or :raise: directives (aliases already normalized)
	 */
	private parseRaises(directives: Map<string, DirectiveInfo[]>): DocstringExceptionDescriptor[] {
		const raiseDirectives = directives.get('raises') || [];

		return raiseDirectives
			.filter(directive => directive.argument)
			.map(directive => ({
				type: directive.argument!,
				description: directive.description,
			}));
	}

	/**
	 * Parse notes from directives (aliases already normalized)
	 */
	private parseNotes(directives: Map<string, DirectiveInfo[]>): string | null {
		const noteDirectives = directives.get('note') || [];

		if (noteDirectives.length === 0) {
			return null;
		}

		const notes = noteDirectives
			.map(d => d.description)
			.filter(desc => desc)
			.join(' ');

		return notes || null;
	}

	/**
	 * Parse type string to extract clean type and optional flag
	 * Detects "optional" keyword (case-insensitive) and removes it
	 * Example: "int, optional" -> {isOptional: true, cleanType: "int"}
	 */
	private parseTypeString(typeStr: string): { isOptional: boolean; cleanType: string } {
		const trimmed = typeStr.trim();
		const hasOptional = /\boptional\b/i.test(trimmed);

		if (!hasOptional) {
			return { isOptional: false, cleanType: trimmed };
		}

		// Remove "optional" keyword and clean up commas
		const cleanType = trimmed
			.replace(/\boptional\b\s*/gi, '')
			.replace(/,\s*$/, '')
			.replace(/^\s*,/, '')
			.trim();

		return { isOptional: true, cleanType };
	}
}
