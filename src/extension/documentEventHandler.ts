/**
 * Handles document-related events (open, save, close).
 */

import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { FunctionDescriptor } from '../parsers/types';

export interface DocumentEventHandlerDependencies {
	logger: Logger;
	parsedFunctionsCache: Map<string, FunctionDescriptor[]>;
	analyzeDocument: (document: vscode.TextDocument) => Promise<void>;
	shouldAnalyze: (document: vscode.TextDocument) => boolean;
}

/**
 * Handles document lifecycle events.
 */
export class DocumentEventHandler {
	private changeTimeouts = new Map<string, NodeJS.Timeout>();
	private readonly DEBOUNCE_DELAY = 200; // ms - reduced for faster feedback after Quick Fixes

	constructor(private deps: DocumentEventHandlerDependencies) { }

	/**
	 * Handle document change event.
	 * Analyzes the document after a debounce delay to avoid excessive re-analysis.
	 */
	handleDocumentChange(event: vscode.TextDocumentChangeEvent): void {
		const document = event.document;

		if (!this.deps.shouldAnalyze(document)) {
			return;
		}

		// Skip if no actual content changes (e.g., just cursor movement)
		if (event.contentChanges.length === 0) {
			return;
		}

		const docUri = document.uri.toString();

		// Clear existing timeout for this document
		const existingTimeout = this.changeTimeouts.get(docUri);
		if (existingTimeout) {
			clearTimeout(existingTimeout);
		}

		// Set new timeout to analyze after debounce delay
		const timeout = setTimeout(() => {
			this.deps.logger.debug(`Document changed (debounced): ${document.fileName}`);
			this.deps.analyzeDocument(document);
			this.changeTimeouts.delete(docUri);
		}, this.DEBOUNCE_DELAY);

		this.changeTimeouts.set(docUri, timeout);
	}

	/**
	 * Handle document save event.
	 * Analyzes the document for docstring mismatches.
	 */
	handleDocumentSave(document: vscode.TextDocument): void {
		if (this.deps.shouldAnalyze(document)) {
			this.deps.logger.debug(`Document saved: ${document.fileName}`);
			this.deps.analyzeDocument(document);
		}
	}

	/**
	 * Handle document open event.
	 * Analyzes the document for docstring mismatches.
	 */
	handleDocumentOpen(document: vscode.TextDocument): void {
		if (this.deps.shouldAnalyze(document)) {
			this.deps.logger.debug(`Document opened: ${document.fileName}`);
			this.deps.analyzeDocument(document);
		}
	}

	/**
	 * Handle document close event.
	 * Clears cached parsed functions to free memory.
	 */
	handleDocumentClose(document: vscode.TextDocument): void {
		const docUri = document.uri.toString();

		// Clear any pending analysis timeout
		const timeout = this.changeTimeouts.get(docUri);
		if (timeout) {
			clearTimeout(timeout);
			this.changeTimeouts.delete(docUri);
		}

		// Clear cached parsed functions
		if (this.deps.parsedFunctionsCache.has(docUri)) {
			this.deps.parsedFunctionsCache.delete(docUri);
			this.deps.logger.trace(`Cleared parsed functions cache for: ${document.fileName}`);
		}
	}

	/**
	 * Analyze all currently open documents.
	 * Called during extension activation.
	 */
	analyzeOpenDocuments(): void {
		vscode.workspace.textDocuments.forEach((document) => {
			if (this.deps.shouldAnalyze(document)) {
				this.deps.analyzeDocument(document);
			}
		});
	}

	/**
	 * Dispose of all resources.
	 * Clears all pending timeouts.
	 */
	dispose(): void {
		for (const timeout of this.changeTimeouts.values()) {
			clearTimeout(timeout);
		}
		this.changeTimeouts.clear();
	}
}
