/**
 * Docstring style detector.
 * Automatically detects whether a docstring is Google-style or Sphinx-style.
 */

export type DocstringStyle = 'google' | 'sphinx' | 'unknown';

/**
 * Detect docstring style from content.
 *
 * Google-style uses section headers like "Args:", "Returns:", "Raises:"
 * Sphinx-style uses reStructuredText directives like ":param:", ":returns:", ":raises:"
 *
 * @param docstring The docstring content to analyze
 * @returns The detected style or 'unknown' if cannot determine
 */
export function detectDocstringStyle(docstring: string): DocstringStyle {
	if (!docstring || docstring.trim().length === 0) {
		return 'unknown';
	}

	let googleScore = 0;
	let sphinxScore = 0;

	// Google-style indicators (section headers)
	const googlePatterns = [
		/^\s*Args?:\s*$/m,           // Args: or Arg:
		/^\s*Arguments?:\s*$/m,      // Arguments: or Argument:
		/^\s*Parameters?:\s*$/m,     // Parameters: or Parameter:
		/^\s*Returns?:\s*$/m,        // Returns: or Return:
		/^\s*Yields?:\s*$/m,         // Yields: or Yield:
		/^\s*Raises?:\s*$/m,         // Raises: or Raise:
		/^\s*Throws?:\s*$/m,         // Throws: or Throw:
		/^\s*Examples?:\s*$/m,       // Examples: or Example:
		/^\s*Notes?:\s*$/m,          // Notes: or Note:
		/^\s*Warnings?:\s*$/m,       // Warnings: or Warning:
		/^\s*See Also:\s*$/m,        // See Also:
		/^\s*Attributes?:\s*$/m,     // Attributes: or Attribute:
	];

	// Sphinx-style indicators (reStructuredText directives)
	const sphinxPatterns = [
		/:param\s+\w+:/,             // :param name:
		/:type\s+\w+:/,              // :type name:
		/:returns?:/,                // :return: or :returns:
		/:rtype:/,                   // :rtype:
		/:raises?\s+\w+:/,           // :raise Exception: or :raises Exception:
		/:yields?:/,                 // :yield: or :yields:
		/:ytype:/,                   // :ytype:
		/:example:/,                 // :example:
		/:note:/,                    // :note:
		/:warning:/,                 // :warning:
		/:seealso:/,                 // :seealso:
		/:var\s+\w+:/,               // :var name:
		/:ivar\s+\w+:/,              // :ivar name:
		/:cvar\s+\w+:/,              // :cvar name:
	];

	// Count matches for each style
	for (const pattern of googlePatterns) {
		if (pattern.test(docstring)) {
			googleScore++;
		}
	}

	for (const pattern of sphinxPatterns) {
		if (pattern.test(docstring)) {
			sphinxScore++;
		}
	}

	// Determine style based on scores
	if (googleScore === 0 && sphinxScore === 0) {
		return 'unknown';
	}

	if (googleScore > sphinxScore) {
		return 'google';
	} else if (sphinxScore > googleScore) {
		return 'sphinx';
	}

	// Equal scores - look for more specific patterns
	// Google-style typically has indented parameter descriptions
	const hasGoogleStructure = /^\s*Args?:\s*\n\s+\w+/m.test(docstring);

	// Sphinx-style has inline directives
	const hasSphinxStructure = /:param\s+\w+:/.test(docstring);

	if (hasGoogleStructure && !hasSphinxStructure) {
		return 'google';
	} else if (hasSphinxStructure && !hasGoogleStructure) {
		return 'sphinx';
	}

	// Still equal - default to Google (more common)
	if (googleScore > 0) {
		return 'google';
	}

	return 'unknown';
}

/**
 * Detect the predominant docstring style in a file.
 * Analyzes multiple docstrings and returns the most common style.
 *
 * Performance: Only analyzes first maxSamples docstrings to avoid overhead
 * on large files. In practice, files use consistent style throughout.
 *
 * @param docstrings Array of docstring contents from the file
 * @param maxSamples Maximum number of docstrings to analyze (default: 20)
 * @returns The predominant style or 'google' as default
 */
export function detectFileDocstringStyle(
	docstrings: string[],
	maxSamples: number = 20
): DocstringStyle {
	if (docstrings.length === 0) {
		return 'google'; // Default to Google style
	}

	// For performance, only analyze first N docstrings
	// In practice, files use consistent style throughout
	const samplesToAnalyze = docstrings.slice(0, maxSamples);

	const styles = samplesToAnalyze
		.map(detectDocstringStyle)
		.filter(style => style !== 'unknown');

	if (styles.length === 0) {
		return 'google'; // Default to Google style
	}

	// Count occurrences of each style
	const styleCounts: Record<string, number> = {
		google: 0,
		sphinx: 0
	};

	for (const style of styles) {
		styleCounts[style] = (styleCounts[style] || 0) + 1;
	}

	// Return the most common style (Google style wins ties for consistency)
	if (styleCounts.google > styleCounts.sphinx) {
		return 'google';
	} else if (styleCounts.sphinx > styleCounts.google) {
		return 'sphinx';
	}

	// Equal counts - default to Google (more common in Python community)
	return 'google';
}
