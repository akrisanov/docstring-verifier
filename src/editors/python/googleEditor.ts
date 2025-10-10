/**
 * Google-style docstring editor.
 *
 * Provides surgical editing for Google-style docstrings:
 *
 * ```
 * """Function summary.
 *
 * Args:
 *     param_name (type): Description
 *
 * Returns:
 *     type: Description
 *
 * Raises:
 *     ExceptionType: Description
 * """
 * ```
 */

import * as vscode from 'vscode';
import { IDocstringEditor, EditorOptions, SectionInfo } from '../base';
import { ParameterDescriptor } from '../../parsers/types';
import { Logger } from '../../utils/logger';

/**
 * Google-style docstring editor implementation.
 */
export class GoogleDocstringEditor implements IDocstringEditor {
	private logger: Logger;
	private options: Required<EditorOptions>;
	private lines: string[];
	private sections: Map<string, SectionInfo>;
	private docstringRange: vscode.Range | null;
	private originalText: string;

	constructor(options?: EditorOptions) {
		this.logger = new Logger('Docstring Verifier - Google Editor');
		this.options = {
			indent: options?.indent ?? 4,
			maxLineLength: options?.maxLineLength ?? 88,
			preserveEmptyLines: options?.preserveEmptyLines ?? true,
		};
		this.lines = [];
		this.sections = new Map();
		this.docstringRange = null;
		this.originalText = '';
	}

	/**
	 * Load docstring for editing.
	 */
	load(text: string): void {
		this.originalText = text;
		this.lines = text.split('\n');
		this.sections.clear();
		this.parseStructure();
		this.logger.trace(`Loaded docstring with ${this.lines.length} lines`);
	}

	/**
	 * Add parameter to Args section.
	 */
	addParameter(param: ParameterDescriptor): void {
		this.logger.trace(`Adding parameter: ${param.name}`);

		// Check if parameter already exists
		if (this.findParameterLine(param.name) !== -1) {
			this.logger.warn(`Parameter ${param.name} already exists`);
			return;
		}

		// Get or create Args section
		let argsSection = this.sections.get('Args');
		if (!argsSection) {
			argsSection = this.createArgsSection();
		}

		// Format parameter line
		const paramLine = this.formatParameterLine(param);

		// Find insertion point (after last parameter or after "Args:" line)
		const insertIndex = this.findParameterInsertionPoint(argsSection);

		// Insert the line
		this.lines.splice(insertIndex, 0, paramLine);

		// Update section info
		this.updateSectionRanges(insertIndex, 1);

		this.logger.trace(`Inserted parameter at line ${insertIndex}`);
	}

	/**
	 * Remove parameter from Args section.
	 */
	removeParameter(paramName: string): void {
		this.logger.trace(`Removing parameter: ${paramName}`);

		const paramIndex = this.findParameterLine(paramName);
		if (paramIndex === -1) {
			this.logger.warn(`Parameter ${paramName} not found`);
			return;
		}

		// Remove the line
		this.lines.splice(paramIndex, 1);

		// Update section ranges
		this.updateSectionRanges(paramIndex, -1);

		// Check if Args section is now empty and remove if needed
		this.removeEmptySections();

		this.logger.trace(`Removed parameter from line ${paramIndex}`);
	}

	/**
	 * Update parameter type.
	 */
	updateParameterType(paramName: string, newType: string): void {
		this.logger.trace(`Updating type for parameter ${paramName} to ${newType}`);

		const paramIndex = this.findParameterLine(paramName);
		if (paramIndex === -1) {
			this.logger.warn(`Parameter ${paramName} not found`);
			return;
		}

		// Parse line: "    name (old_type): description"
		const line = this.lines[paramIndex];
		const match = line.match(/^(\s*)(\w+)\s*\([^)]*\):\s*(.*)$/);

		if (!match) {
			this.logger.warn(`Cannot parse parameter line: ${line}`);
			return;
		}

		const [, indent, name, description] = match;

		// Replace with new type
		this.lines[paramIndex] = `${indent}${name} (${newType}): ${description}`;

		this.logger.trace(`Updated parameter type at line ${paramIndex}`);
	}

	/**
	 * Update parameter optional status.
	 */
	updateParameterOptional(paramName: string, optional: boolean): void {
		this.logger.trace(`Updating optional status for ${paramName} to ${optional}`);

		const paramIndex = this.findParameterLine(paramName);
		if (paramIndex === -1) {
			this.logger.warn(`Parameter ${paramName} not found`);
			return;
		}

		const line = this.lines[paramIndex];
		const match = line.match(/^(\s*)(\w+)\s*\(([^)]*)\):\s*(.*)$/);

		if (!match) {
			this.logger.warn(`Cannot parse parameter line: ${line}`);
			return;
		}

		const [, indent, name, type, description] = match;

		// Add or remove "optional" from description
		let newDescription = description;
		const hasOptional = /\boptional\b/i.test(description);

		if (optional && !hasOptional) {
			// Add "optional" prefix
			newDescription = `optional. ${description}`;
		} else if (!optional && hasOptional) {
			// Remove "optional" prefix/marker
			newDescription = description.replace(/\boptional\.?\s*/gi, '');
		}

		this.lines[paramIndex] = `${indent}${name} (${type}): ${newDescription}`;

		this.logger.trace(`Updated optional status at line ${paramIndex}`);
	}

	/**
	 * Add return documentation.
	 */
	addReturn(returnType: string, description?: string): void {
		this.logger.trace(`Adding return: ${returnType}`);

		// Check if Returns section already exists
		if (this.sections.has('Returns')) {
			this.logger.warn('Returns section already exists');
			return;
		}

		const desc = description || 'TODO: Add description';
		const returnLine = `${' '.repeat(this.options.indent)}${returnType}: ${desc}`;

		// Find insertion point (after Args section or after summary)
		const insertIndex = this.findReturnInsertionPoint();

		// Insert section header and content
		this.lines.splice(insertIndex, 0, '', 'Returns:', returnLine);

		// Update section ranges
		this.updateSectionRanges(insertIndex, 3);

		this.logger.trace(`Inserted Returns section at line ${insertIndex}`);
	}

	/**
	 * Remove Returns section.
	 */
	removeReturn(): void {
		this.logger.trace('Removing Returns section');

		const returnsSection = this.sections.get('Returns');
		if (!returnsSection) {
			this.logger.warn('Returns section not found');
			return;
		}

		// Remove section including header and content
		const linesToRemove = returnsSection.endLine - returnsSection.startLine + 1;
		this.lines.splice(returnsSection.startLine, linesToRemove);

		// Update section ranges
		this.updateSectionRanges(returnsSection.startLine, -linesToRemove);

		this.sections.delete('Returns');

		this.logger.trace(`Removed Returns section (${linesToRemove} lines)`);
	}

	/**
	 * Update return type.
	 */
	updateReturnType(newType: string): void {
		this.logger.trace(`Updating return type to ${newType}`);

		const returnsSection = this.sections.get('Returns');
		if (!returnsSection) {
			this.logger.warn('Returns section not found');
			return;
		}

		// Find the return line (first content line after "Returns:")
		const returnLineIndex = returnsSection.startLine + 1;
		if (returnLineIndex >= this.lines.length) {
			this.logger.warn('Return content line not found');
			return;
		}

		const line = this.lines[returnLineIndex];
		const match = line.match(/^(\s*)([^:]+):\s*(.*)$/);

		if (!match) {
			this.logger.warn(`Cannot parse return line: ${line}`);
			return;
		}

		const [, indent, , description] = match;

		// Replace with new type
		this.lines[returnLineIndex] = `${indent}${newType}: ${description}`;

		this.logger.trace(`Updated return type at line ${returnLineIndex}`);
	}

	/**
	 * Add exception documentation.
	 */
	addException(exceptionType: string, description?: string): void {
		this.logger.trace(`Adding exception: ${exceptionType}`);

		// Check if exception already exists
		if (this.findExceptionLine(exceptionType) !== -1) {
			this.logger.warn(`Exception ${exceptionType} already exists`);
			return;
		}

		// Get or create Raises section
		let raisesSection = this.sections.get('Raises');
		if (!raisesSection) {
			raisesSection = this.createRaisesSection();
		}

		const desc = description || 'TODO: Add description';
		const exceptionLine = `${' '.repeat(this.options.indent * 2)}${exceptionType}: ${desc}`;

		// Find insertion point (after last exception or after "Raises:" line)
		const insertIndex = this.findExceptionInsertionPoint(raisesSection);

		// Insert the line
		this.lines.splice(insertIndex, 0, exceptionLine);

		// Update section ranges
		this.updateSectionRanges(insertIndex, 1);

		this.logger.trace(`Inserted exception at line ${insertIndex}`);
	}

	/**
	 * Remove exception from Raises section.
	 */
	removeException(exceptionType: string): void {
		this.logger.trace(`Removing exception: ${exceptionType}`);

		const exceptionIndex = this.findExceptionLine(exceptionType);
		if (exceptionIndex === -1) {
			this.logger.warn(`Exception ${exceptionType} not found`);
			return;
		}

		// Remove the line
		this.lines.splice(exceptionIndex, 1);

		// Update section ranges
		this.updateSectionRanges(exceptionIndex, -1);

		// Check if Raises section is now empty and remove if needed
		this.removeEmptySections();

		this.logger.trace(`Removed exception from line ${exceptionIndex}`);
	}

	/**
	 * Get edited docstring text.
	 */
	getText(): string {
		return this.lines.join('\n');
	}

	/**
	 * Get docstring range.
	 */
	getRange(): vscode.Range | null {
		return this.docstringRange;
	}

	// Private helper methods

	/**
	 * Parse docstring structure to identify sections.
	 */
	private parseStructure(): void {
		const sectionPattern = /^(Args?|Arguments?|Parameters?|Returns?|Return|Yields?|Yield|Raises?|Raise|Throws?|Note|Notes?):\s*$/i;

		let currentSection: SectionInfo | null = null;

		for (let i = 0; i < this.lines.length; i++) {
			const line = this.lines[i];
			const match = line.match(sectionPattern);

			if (match) {
				// Save previous section
				if (currentSection) {
					currentSection.endLine = i - 1;
					this.sections.set(currentSection.name, currentSection);
				}

				// Start new section
				const sectionName = this.normalizeSectionName(match[1]);
				currentSection = {
					name: sectionName,
					startLine: i,
					endLine: i,
					indent: this.getIndentation(line),
				};
			}
		}

		// Save last section
		if (currentSection) {
			currentSection.endLine = this.lines.length - 1;
			this.sections.set(currentSection.name, currentSection);
		}

		this.logger.trace(`Parsed ${this.sections.size} sections`);
	}

	/**
	 * Normalize section name (e.g., "Arguments" -> "Args", "Raises" -> "Raises").
	 */
	private normalizeSectionName(name: string): string {
		const normalized = name.toLowerCase();
		if (normalized.startsWith('arg') || normalized.startsWith('param')) {
			return 'Args';
		}
		if (normalized.startsWith('return')) {
			return 'Returns';
		}
		if (normalized.startsWith('yield')) {
			return 'Yields';
		}
		if (normalized.startsWith('raise') || normalized.startsWith('throw')) {
			return 'Raises';
		}
		if (normalized.startsWith('note')) {
			return 'Note';
		}
		return name;
	}

	/**
	 * Get indentation level (number of spaces) for a line.
	 */
	private getIndentation(line: string): number {
		const match = line.match(/^(\s*)/);
		return match ? match[1].length : 0;
	}

	/**
	 * Format parameter line in Google style.
	 */
	private formatParameterLine(param: ParameterDescriptor): string {
		const indent = ' '.repeat(this.options.indent * 2); // Args items are double-indented
		const typeStr = param.type || 'Any';
		return `${indent}${param.name} (${typeStr}): TODO: Add description`;
	}

	/**
	 * Find line index for a parameter by name.
	 */
	private findParameterLine(paramName: string): number {
		const argsSection = this.sections.get('Args');
		if (!argsSection) {
			return -1;
		}

		// Use regex with word boundary to match exact parameter name
		const paramPattern = new RegExp(`^\\s*${this.escapeRegex(paramName)}\\s*\\(`);

		for (let i = argsSection.startLine + 1; i <= argsSection.endLine; i++) {
			const line = this.lines[i];
			// Match "    paramName (type): description" with exact name
			if (paramPattern.test(line)) {
				return i;
			}
		}

		return -1;
	}

	/**
	 * Find line index for an exception by type.
	 */
	private findExceptionLine(exceptionType: string): number {
		const raisesSection = this.sections.get('Raises');
		if (!raisesSection) {
			return -1;
		}

		// Use regex with word boundary to match exact exception type
		const exceptionPattern = new RegExp(`^\\s*${this.escapeRegex(exceptionType)}\\s*:`);

		for (let i = raisesSection.startLine + 1; i <= raisesSection.endLine; i++) {
			const line = this.lines[i];
			// Match "    ExceptionType: description" with exact type
			if (exceptionPattern.test(line)) {
				return i;
			}
		}

		return -1;
	}

	/**
	 * Find insertion point for a new parameter.
	 */
	private findParameterInsertionPoint(argsSection: SectionInfo): number {
		// Insert after the last parameter line (inside the section)
		// or right after "Args:" header if section is empty
		// Note: endLine points to the last line of content, not the header
		// So we insert at endLine + 1, which is still inside or right after the section
		return argsSection.endLine + 1;
	}

	/**
	 * Find insertion point for Returns section.
	 */
	private findReturnInsertionPoint(): number {
		// Insert after Args section if it exists, otherwise after summary
		const argsSection = this.sections.get('Args');
		if (argsSection) {
			return argsSection.endLine + 1;
		}

		// Find first non-empty line after opening quotes (summary)
		for (let i = 0; i < this.lines.length; i++) {
			if (this.lines[i].trim() && !this.lines[i].includes('"""') && !this.lines[i].includes("'''")) {
				return i + 1;
			}
		}

		return 1; // Default to line 1
	}

	/**
	 * Find insertion point for a new exception.
	 */
	private findExceptionInsertionPoint(raisesSection: SectionInfo): number {
		// Insert after the last exception line (inside the section)
		// or right after "Raises:" header if section is empty
		// Note: endLine points to the last line of content, not the header
		// So we insert at endLine + 1, which is still inside or right after the section
		return raisesSection.endLine + 1;
	}

	/**
	 * Create Args section if it doesn't exist.
	 */
	private createArgsSection(): SectionInfo {
		// Find insertion point (after summary, before Returns/Raises)
		let insertIndex = 1; // After opening quotes

		const returnsSection = this.sections.get('Returns');
		const raisesSection = this.sections.get('Raises');

		if (returnsSection) {
			insertIndex = returnsSection.startLine;
		} else if (raisesSection) {
			insertIndex = raisesSection.startLine;
		} else {
			// Find last non-empty line before closing quotes
			for (let i = this.lines.length - 1; i >= 0; i--) {
				const line = this.lines[i];
				if (line.trim() && !line.includes('"""') && !line.includes("'''")) {
					insertIndex = i + 1;
					break;
				}
			}
		}

		// Insert "Args:" section header
		this.lines.splice(insertIndex, 0, '', 'Args:');

		// Update section ranges for sections after insertion
		this.updateSectionRanges(insertIndex, 2);

		const argsSection: SectionInfo = {
			name: 'Args',
			startLine: insertIndex + 1, // Line with "Args:"
			endLine: insertIndex + 1,
			indent: 0,
		};

		this.sections.set('Args', argsSection);

		this.logger.trace(`Created Args section at line ${insertIndex}`);

		return argsSection;
	}

	/**
	 * Create Raises section if it doesn't exist.
	 */
	private createRaisesSection(): SectionInfo {
		// Find insertion point (after Returns or Args)
		let insertIndex = this.lines.length - 1; // Before closing quotes

		const returnsSection = this.sections.get('Returns');
		const argsSection = this.sections.get('Args');

		if (returnsSection) {
			insertIndex = returnsSection.endLine + 1;
		} else if (argsSection) {
			insertIndex = argsSection.endLine + 1;
		}

		// Insert "Raises:" section header
		this.lines.splice(insertIndex, 0, '', 'Raises:');

		// Update section ranges for sections after insertion
		this.updateSectionRanges(insertIndex, 2);

		const raisesSection: SectionInfo = {
			name: 'Raises',
			startLine: insertIndex + 1, // Line with "Raises:"
			endLine: insertIndex + 1,
			indent: 0,
		};

		this.sections.set('Raises', raisesSection);

		this.logger.trace(`Created Raises section at line ${insertIndex}`);

		return raisesSection;
	}

	/**
	 * Update section ranges after insertion/deletion.
	 */
	private updateSectionRanges(changeIndex: number, linesDelta: number): void {
		for (const [name, section] of this.sections.entries()) {
			if (section.startLine >= changeIndex) {
				section.startLine += linesDelta;
			}
			if (section.endLine >= changeIndex) {
				section.endLine += linesDelta;
			}
			this.sections.set(name, section);
		}
	}

	/**
	 * Remove empty sections (sections with only header, no content).
	 */
	private removeEmptySections(): void {
		// Collect sections to remove first to avoid iterator invalidation
		// when modifying the Map during iteration
		const sectionsToRemove: string[] = [];

		for (const [name, section] of this.sections.entries()) {
			// Check if section has only the header line
			const hasContent = section.endLine > section.startLine;
			if (!hasContent) {
				sectionsToRemove.push(name);
			}
		}

		// Remove collected sections
		// Process in reverse order to avoid coordinate shifts affecting subsequent deletions
		sectionsToRemove.reverse();
		for (const name of sectionsToRemove) {
			const section = this.sections.get(name);
			if (section) {
				// Remove section header
				this.lines.splice(section.startLine, 1);
				this.updateSectionRanges(section.startLine, -1);
				this.sections.delete(name);
				this.logger.trace(`Removed empty ${name} section`);
			}
		}
	}

	/**
	 * Escape special regex characters in a string.
	 */
	private escapeRegex(str: string): string {
		return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}
}

