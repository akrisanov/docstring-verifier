/**
 * Registry for language-specific docstring editor handlers.
 *
 * Similar to LanguageHandlerRegistry, but for docstring editing.
 * Each language (Python, TypeScript, etc.) registers an EditorHandler
 * that provides editors for different docstring styles.
 */

import { Logger } from '../utils/logger';
import { EditorHandler } from './types';
import { IDocstringEditor } from './base';

/**
 * Central registry for editor handlers.
 */
export class EditorHandlerRegistry {
	private handlers: Map<string, EditorHandler>;
	private logger: Logger;

	constructor() {
		this.handlers = new Map();
		this.logger = new Logger('Docstring Verifier - Editor Registry');
	}

	/**
	 * Register an editor handler for a language.
	 *
	 * @param languageId VS Code language ID (e.g., 'python', 'typescript')
	 * @param handler Editor handler for this language
	 */
	register(languageId: string, handler: EditorHandler): void {
		this.handlers.set(languageId, handler);
		this.logger.trace(`Registered editor handler for language: ${languageId}`);
	}

	/**
	 * Check if a language has registered editors.
	 *
	 * @param languageId VS Code language ID
	 * @returns True if language is supported
	 */
	isSupported(languageId: string): boolean {
		return this.handlers.has(languageId);
	}

	/**
	 * Get editor handler for a language.
	 *
	 * @param languageId VS Code language ID
	 * @returns Editor handler or undefined if not registered
	 */
	get(languageId: string): EditorHandler | undefined {
		return this.handlers.get(languageId);
	}

	/**
	 * Get an editor for the specified language and style
	 * Creates a new editor instance to avoid shared state issues
	 * @param languageId - The language identifier (e.g., 'python')
	 * @param style - The docstring style (e.g., 'google', 'sphinx')
	 * @returns A new editor instance, or undefined if not found
	 */
	getEditor(languageId: string, style: string): IDocstringEditor | undefined {
		const handler = this.handlers.get(languageId);
		if (!handler) {
			this.logger.warn(`No editor handler registered for language: ${languageId}`);
			return undefined;
		}

		const factory = handler.editorFactories.get(style);
		if (!factory) {
			this.logger.warn(
				`No editor found for language '${languageId}' and style '${style}'`
			);
			return undefined;
		}

		// Create a new instance to avoid shared state
		return factory();
	}	/**
	 * Auto-detect style and get appropriate editor.
	 *
	 * @param languageId VS Code language ID
	 * @param docstringText Existing docstring text to analyze
	 * @returns Editor instance or undefined if not found
	 */
	getEditorAuto(languageId: string, docstringText: string): IDocstringEditor | undefined {
		const handler = this.handlers.get(languageId);
		if (!handler) {
			this.logger.warn(`No editor handler registered for language: ${languageId}`);
			return undefined;
		}

		const style = handler.detectStyle(docstringText);
		this.logger.trace(`Auto-detected style '${style}' for ${languageId}`);

		return this.getEditor(languageId, style);
	}

	/**
	 * Get the default editor for a language
	 * Creates a new editor instance to avoid shared state issues
	 * @param languageId - The language identifier
	 * @returns A new default editor instance, or undefined if not found
	 */
	getDefaultEditor(languageId: string): IDocstringEditor | undefined {
		const handler = this.handlers.get(languageId);
		if (!handler) {
			this.logger.warn(`No editor handler registered for language: ${languageId}`);
			return undefined;
		}

		const defaultStyle = handler.getDefaultStyle();
		return this.getEditor(languageId, defaultStyle);
	}	/**
	 * Get all supported languages.
	 *
	 * @returns Array of language IDs
	 */
	getSupportedLanguages(): string[] {
		return Array.from(this.handlers.keys());
	}

	/**
	 * Get all supported styles for a language.
	 *
	 * @param languageId VS Code language ID
	 * @returns Array of style names or empty array if language not supported
	 */
	getSupportedStyles(languageId: string): string[] {
		const handler = this.handlers.get(languageId);
		if (!handler) {
			return [];
		}
		return Array.from(handler.editorFactories.keys());
	}
}
