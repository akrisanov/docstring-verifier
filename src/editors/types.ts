/**
 * Editor handler types and interfaces.
 *
 * Each supported language (Python, TypeScript, JavaScript) implements the EditorHandler interface.
 * This allows for language-agnostic docstring editing in Code Actions.
 */

import { IDocstringEditor } from './base';

/**
 * Handler for managing docstring editors for a specific language
 */
export interface EditorHandler {
	/**
	 * Map of docstring style to editor factory function
	 * Factory functions create new editor instances to avoid shared state issues
	 * e.g., 'google' -> () => new GoogleDocstringEditor()
	 */
	editorFactories: Map<string, () => IDocstringEditor>;

	/**
	 * Detect the docstring style from the given text
	 * @param text - The docstring text to analyze
	 * @returns The detected style name (e.g., 'google', 'sphinx')
	 */
	detectStyle(text: string): string;

	/**
	 * Get the default docstring style for this language
	 * @returns The default style name
	 */
	getDefaultStyle(): string;
}
