/**
 * Python language handler factory.
 *
 * Creates and configures Python-specific components:
 * - Python parser (using ast_extractor.py)
 * - Docstring parsers (Google, Sphinx)
 * - Analyzers (Signature, Return, Exception, Side Effects)
 * - Docstring style detection and caching
 */

import * as vscode from 'vscode';
import { LanguageHandler } from '../types';
import { PythonParser } from '../../parsers/python/pythonParser';
import {
	GoogleDocstringParser,
	SphinxDocstringParser,
	detectFileDocstringStyle
} from '../../docstring/python';
import {
	PythonSignatureAnalyzer,
	PythonReturnAnalyzer,
	PythonExceptionAnalyzer,
	PythonSideEffectsAnalyzer
} from '../../analyzers/python';
import { IDocstringParser } from '../../docstring/base';
import { FunctionDescriptor } from '../../parsers/types';
import { getDocstringStyle } from '../../utils/config';
import { Logger } from '../../utils/logger';

/**
 * Create Python language handler.
 *
 * This factory creates all Python-specific components and wires them together.
 * The handler includes:
 * - Python AST parser
 * - Google and Sphinx docstring parsers
 * - All Python analyzers
 * - Auto-detection of docstring style with caching
 *
 * @param context VS Code extension context (needed for Python parser initialization)
 * @returns Configured Python language handler
 */
export function createPythonHandler(context: vscode.ExtensionContext): LanguageHandler {
	const logger = new Logger('Docstring Verifier - Python Handler');

	// Initialize parser
	const parser = new PythonParser(context);
	logger.debug('Initialized Python parser');

	// Initialize docstring parsers
	const docstringParsers = new Map<string, IDocstringParser>([
		['google', new GoogleDocstringParser()],
		['sphinx', new SphinxDocstringParser()],
	]);
	logger.debug('Initialized Google and Sphinx docstring parsers');

	// Initialize analyzers
	const analyzers = [
		new PythonSignatureAnalyzer(),
		new PythonReturnAnalyzer(),
		new PythonExceptionAnalyzer(),
		new PythonSideEffectsAnalyzer(),
	];
	logger.debug('Initialized Python analyzers');

	// Cache for detected docstring styles per document
	// Key: document URI, Value: detected style ('google' or 'sphinx')
	const styleCache = new Map<string, 'google' | 'sphinx'>();

	return {
		parser,
		docstringParsers,
		analyzers,

		/**
		 * Select appropriate docstring parser for a Python document.
		 *
		 * Behavior:
		 * - If user configured a specific style: use it
		 * - If user set 'auto': detect style from docstrings and cache result
		 * - Cache is cleared when document is closed (handled by extension.ts)
		 *
		 * @param document The Python document being analyzed
		 * @param functions Functions extracted from the document
		 * @returns The appropriate docstring parser (Google or Sphinx)
		 */
		selectDocstringParser(
			document: vscode.TextDocument,
			functions: FunctionDescriptor[]
		): IDocstringParser {
			const configuredStyle = getDocstringStyle();
			let detectedStyle: 'google' | 'sphinx' = 'google';

			if (configuredStyle === 'auto') {
				const docUri = document.uri.toString();

				// Check cache first
				const cachedStyle = styleCache.get(docUri);
				if (cachedStyle) {
					logger.trace(`Using cached docstring style for ${document.fileName}: ${cachedStyle}`);
					detectedStyle = cachedStyle;
				} else {
					// Auto-detect from docstrings
					const docstrings = functions
						.map(f => f.docstring)
						.filter((d): d is string => d !== null);

					const detected = detectFileDocstringStyle(docstrings);
					detectedStyle = detected === 'unknown' ? 'google' : detected;

					// Cache the result
					styleCache.set(docUri, detectedStyle);
					logger.debug(`Auto-detected and cached docstring style for ${document.fileName}: ${detectedStyle}`);
				}
			} else {
				// Use configured style
				detectedStyle = configuredStyle;
				logger.trace(`Using configured docstring style: ${detectedStyle}`);
			}

			// Return the appropriate parser
			const selectedParser = docstringParsers.get(detectedStyle);
			if (!selectedParser) {
				logger.warn(`Unknown docstring style '${detectedStyle}', falling back to Google style`);
				return docstringParsers.get('google')!;
			}

			return selectedParser;
		},

		/**
		 * Reset Python handler caches.
		 * Called when Python-related settings change.
		 */
		resetCache(): void {
			// Reset Python executor cache (Python command detection, etc.)
			parser.resetExecutor?.();
			logger.debug('Reset Python executor cache');

			// Clear docstring style cache
			styleCache.clear();
			logger.debug('Cleared docstring style cache');
		}
	};
}

/**
 * Clear docstring style cache for a specific document.
 * This should be called when a document is closed.
 *
 * Note: This is exported separately for use in extension.ts document close handler.
 * The main cache clearing is handled via the resetCache() method.
 *
 * @param handler The Python language handler
 * @param documentUri URI of the document to clear from cache
 */
export function clearDocumentStyleCache(handler: LanguageHandler, documentUri: string): void {
	// This is now handled internally by the factory's closure
	// Kept for API compatibility but not needed with current implementation
	// The cache is internal to the factory and cleared via resetCache()
}
