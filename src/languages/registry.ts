/**
 * Registry for language handlers.
 *
 * Allows dynamic registration and lookup of language support.
 * Extension.ts uses this to get the appropriate handler for each document.
 */

import { LanguageHandler } from './types';
import { Logger } from '../utils/logger';

/**
 * Registry for language handlers.
 * Manages registration and lookup of language-specific handlers.
 */
export class LanguageHandlerRegistry {
	private handlers = new Map<string, LanguageHandler>();
	private logger: Logger;

	constructor() {
		this.logger = new Logger('Docstring Verifier - Language Registry');
	}

	/**
	 * Register a language handler.
	 * @param languageId VS Code language identifier (e.g., 'python', 'typescript')
	 * @param handler Language handler implementation
	 */
	register(languageId: string, handler: LanguageHandler): void {
		this.handlers.set(languageId, handler);
		this.logger.info(`Registered handler for language: ${languageId}`);
	}

	/**
	 * Get handler for a language.
	 * @param languageId VS Code language identifier
	 * @returns Handler or undefined if not registered
	 */
	get(languageId: string): LanguageHandler | undefined {
		return this.handlers.get(languageId);
	}

	/**
	 * Check if a language is supported.
	 * @param languageId VS Code language identifier
	 */
	isSupported(languageId: string): boolean {
		return this.handlers.has(languageId);
	}

	/**
	 * Get all supported language IDs.
	 */
	getSupportedLanguages(): string[] {
		return Array.from(this.handlers.keys());
	}

	/**
	 * Reset caches for all registered handlers.
	 * Useful when settings change that affect multiple languages.
	 */
	resetAllCaches(): void {
		this.logger.debug('Resetting all language handler caches');
		for (const [languageId, handler] of this.handlers.entries()) {
			if (handler.resetCache) {
				handler.resetCache();
				this.logger.trace(`Reset cache for ${languageId}`);
			}
		}
	}

	/**
	 * Reset cache for a specific language.
	 * @param languageId Language to reset cache for
	 */
	resetCache(languageId: string): void {
		const handler = this.handlers.get(languageId);
		if (handler?.resetCache) {
			handler.resetCache();
			this.logger.debug(`Reset cache for ${languageId}`);
		}
	}

	/**
	 * Unregister a language handler.
	 * Useful for testing or dynamic language loading.
	 * @param languageId Language to unregister
	 */
	unregister(languageId: string): boolean {
		const removed = this.handlers.delete(languageId);
		if (removed) {
			this.logger.info(`Unregistered handler for language: ${languageId}`);
		}
		return removed;
	}

	/**
	 * Clear all registered handlers.
	 * Useful for testing or extension deactivation.
	 */
	clear(): void {
		this.logger.debug('Clearing all language handlers');
		this.handlers.clear();
	}
}
