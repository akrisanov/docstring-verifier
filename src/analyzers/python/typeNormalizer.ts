/**
 * Type normalization utilities for Python type annotations.
 * Shared between signature and return analyzers.
 */

/**
 * Normalize type annotation for comparison.
 * Handles common type aliases and syntax variations.
 *
 * TODO (Post-MVP): Handle nested generics properly
 * - Optional[Dict[str, int]] currently breaks due to greedy regex
 * - Union[List[int], Dict[str, str]] not supported
 * - Need proper bracket matching with stack-based parser
 *
 * TODO (Post-MVP): Support Union[A, B] syntax
 * - Currently only handles A | B pipe syntax
 * - Union[int, str] vs int | str should be equivalent
 */
export function normalizeType(type: string): string {
    if (!type) {
        return '';
    }

    let normalized = type.toLowerCase().trim();

    // Common type aliases
    const aliases: Record<string, string> = {
        string: 'str',
        integer: 'int',
        boolean: 'bool',
        float: 'float',
        dictionary: 'dict',
        list: 'list',
        tuple: 'tuple',
        set: 'set',
    };

    // Remove typing module prefix first
    normalized = normalized.replace(/typing\./g, '');

    // Handle Optional[T] -> T | None (simple cases only, no nested brackets)
    // TODO: This breaks on Optional[Dict[str, int]] - stops at first ']'
    normalized = normalized.replace(/optional\[(.*?)\]/g, '$1|none');

    // Normalize union type spacing
    normalized = normalized.replace(/\s*\|\s*/g, '|');

    // Apply aliases to all parts of the type (including complex types)
    // Replace whole words only to avoid partial matches (e.g., "string" in "mystring")
    for (const [alias, replacement] of Object.entries(aliases)) {
        // Use word boundaries for simple types, but also handle types in brackets
        const pattern = new RegExp(`\\b${alias}\\b`, 'g');
        normalized = normalized.replace(pattern, replacement);
    }

    return normalized;
}
