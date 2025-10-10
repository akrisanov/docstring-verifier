/**
 * Base interfaces and types for docstring editors.
 *
 * Editors provide surgical editing capabilities for existing docstrings,
 * allowing precise modifications without regenerating the entire content.
 */

import * as vscode from 'vscode';
import { ParameterDescriptor } from '../parsers/types';

/**
 * Options for configuring docstring editor behavior.
 */
export interface EditorOptions {
	/**
	 * Number of spaces for indentation.
	 * @default 4
	 */
	indent?: number;

	/**
	 * Maximum line length for wrapping.
	 * @default 88
	 */
	maxLineLength?: number;

	/**
	 * Whether to preserve empty lines between sections.
	 * @default true
	 */
	preserveEmptyLines?: boolean;
}

/**
 * Interface for editing docstrings surgically.
 *
 * Unlike generators that create entire docstrings from scratch,
 * editors modify existing docstrings while preserving all user content
 * except for the specific changes requested.
 *
 * Key principles:
 * - Only modify what's necessary
 * - Preserve user descriptions
 * - Maintain formatting and structure
 * - Keep all custom sections (Examples, Note, etc.)
 */
export interface IDocstringEditor {
	/**
	 * Load existing docstring text for editing.
	 *
	 * This parses the docstring into an editable internal structure
	 * while preserving all original content and formatting.
	 *
	 * @param text The complete docstring text (including quotes)
	 */
	load(text: string): void;

	/**
	 * Add a parameter to the Args/Parameters section.
	 *
	 * If the Args section doesn't exist, it will be created.
	 * The parameter is inserted in the correct position based on the function signature order.
	 * A placeholder description "TODO: Add description" is used if description is not provided.
	 *
	 * @param param The parameter to add
	 * @param description Optional description (default: "TODO: Add description")
	 * @param allParameters Optional array of all function parameters to determine correct insertion order
	 */
	addParameter(param: ParameterDescriptor, description?: string, allParameters?: ParameterDescriptor[]): void;

	/**
	 * Remove a parameter from the Args/Parameters section.
	 *
	 * If the Args section becomes empty after removal, it can be removed entirely
	 * depending on editor options.
	 *
	 * @param paramName The name of the parameter to remove
	 */
	removeParameter(paramName: string): void;

	/**
	 * Update the type of an existing parameter.
	 *
	 * The parameter description is preserved.
	 *
	 * @param paramName The name of the parameter
	 * @param newType The new type string
	 */
	updateParameterType(paramName: string, newType: string): void;

	/**
	 * Update the optional status of a parameter.
	 *
	 * This adds or removes the "optional" marker in the description or type.
	 *
	 * @param paramName The name of the parameter
	 * @param optional Whether the parameter should be marked as optional
	 */
	updateParameterOptional(paramName: string, optional: boolean): void;

	/**
	 * Add return documentation to the Returns section.
	 *
	 * @param returnType The return type
	 * @param description Optional description (default: "TODO: Add description")
	 */
	addReturn(returnType: string, description?: string): void;

	/**
	 * Remove the Returns section.
	 */
	removeReturn(): void;

	/**
	 * Update the return type.
	 *
	 * Preserves the description.
	 *
	 * @param newType The new return type
	 */
	updateReturnType(newType: string): void;

	/**
	 * Add exception documentation to the Raises section.
	 *
	 * @param exceptionType The exception class name
	 * @param description Optional description (default: "TODO: Add description")
	 */
	addException(exceptionType: string, description?: string): void;

	/**
	 * Remove an exception from the Raises section.
	 *
	 * @param exceptionType The exception class name to remove
	 */
	removeException(exceptionType: string): void;

	/**
	 * Get the edited docstring text.
	 *
	 * @returns The modified docstring with all edits applied
	 */
	getText(): string;

	/**
	 * Get the range of the docstring in the document.
	 *
	 * This is useful for creating WorkspaceEdit to replace the docstring.
	 *
	 * @returns The range covering the entire docstring (including quotes)
	 */
	getRange(): vscode.Range | null;
}

/**
 * Information about a section in the docstring.
 */
export interface SectionInfo {
	/**
	 * Section name (e.g., "Args", "Returns", "Raises")
	 */
	name: string;

	/**
	 * Start line index (0-based)
	 */
	startLine: number;

	/**
	 * End line index (0-based, inclusive)
	 */
	endLine: number;

	/**
	 * Indentation level
	 */
	indent: number;
}
