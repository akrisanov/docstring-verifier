/**
 * Docstring editors for surgical modifications.
 *
 * This module provides editors that can modify existing docstrings
 * while preserving user content and formatting.
 *
 * Architecture:
 * - Each language has an EditorHandler that provides editors for different styles
 * - EditorHandlerRegistry manages language-specific handlers
 * - Similar to LanguageHandlerRegistry for parsers and analyzers
 */

export { IDocstringEditor, EditorOptions, SectionInfo } from './base';
export { EditorHandler } from './types';
export { EditorHandlerRegistry } from './registry';
export { createPythonEditorHandler } from './python';
