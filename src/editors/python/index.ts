/**
 * Python docstring editor handler.
 *
 * Provides editors for Python docstring styles:
 * - Google style (implemented)
 * - Sphinx style (TODO: Phase 3)
 */

import { EditorHandler } from '../types';
import { IDocstringEditor } from '../base';
import { GoogleDocstringEditor } from './googleEditor';
import { getDocstringStyle } from '../../utils/config';

/**
 * Create a Python editor handler
 * @returns EditorHandler for Python
 */
export function createPythonEditorHandler(): EditorHandler {
	// Register available Python docstring editor factories
	// Each factory creates a new instance to avoid shared state issues
	const editorFactories = new Map<string, () => IDocstringEditor>();
	editorFactories.set('google', () => new GoogleDocstringEditor());

	// TODO: Add SphinxDocstringEditor when implemented
	// editorFactories.set('sphinx', () => new SphinxDocstringEditor());

	return {
		editorFactories,

		/**
		 * Detect Python docstring style from text.
		 *
		 * Uses simple heuristics:
		 * - Sphinx: Contains `:param`, `:returns:`, `:raises:` directives
		 * - Google: Default fallback
		 */
		detectStyle(docstringText: string): string {
			// Check for Sphinx-style directives
			const isSphinx =
				/:param\s+\w+:/i.test(docstringText) ||
				/:returns?:/i.test(docstringText) ||
				/:raises?:/i.test(docstringText) ||
				/:type\s+\w+:/i.test(docstringText);

			return isSphinx ? 'sphinx' : 'google';
		},

		/**
		 * Get default Python docstring style.
		 *
		 * Reads from user settings or defaults to 'google'.
		 */
		getDefaultStyle(): string {
			const configStyle = getDocstringStyle();

			// 'auto' means we'll detect at runtime, but for default we use 'google'
			if (configStyle === 'auto') {
				return 'google';
			}

			return configStyle;
		},
	};
}
