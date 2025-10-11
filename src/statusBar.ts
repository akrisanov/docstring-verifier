/**
 * Status bar indicator for docstring issues.
 * Shows the count of issues and allows quick access to Problems panel.
 */

import * as vscode from 'vscode';
import { Logger } from './utils/logger';

/**
 * Status bar item manager for Docstring Verifier.
 *
 * Displays issue count in the status bar and provides quick access
 * to the Problems panel when clicked.
 */
export class StatusBarManager {
	private statusBarItem: vscode.StatusBarItem;
	private logger: Logger;
	private diagnosticCollection: vscode.DiagnosticCollection;

	constructor(diagnosticCollection: vscode.DiagnosticCollection) {
		this.logger = new Logger('Docstring Verifier - Status Bar');
		this.diagnosticCollection = diagnosticCollection;

		// Create status bar item (aligned to the right, before problems indicator)
		this.statusBarItem = vscode.window.createStatusBarItem(
			vscode.StatusBarAlignment.Right,
			100
		);

		// Set icon and command
		this.statusBarItem.command = 'workbench.actions.view.problems';
		this.statusBarItem.tooltip = 'Docstring issues - Click to open Problems panel';

		// Initial update
		this.update();

		this.logger.debug('Status bar manager initialized');
	}

	/**
	 * Update the status bar with current diagnostic count.
	 */
	update(): void {
		const issueCount = this.getTotalIssueCount();

		if (issueCount === 0) {
			// Hide when no issues
			this.statusBarItem.hide();
			this.logger.trace('Status bar hidden (no issues)');
			return;
		}

		// Show issue count with warning icon
		const text = issueCount === 1 ? '1 docstring issue' : `${issueCount} docstring issues`;
		this.statusBarItem.text = `$(warning) ${text}`;
		this.statusBarItem.show();

		this.logger.trace(`Status bar updated: ${issueCount} issue(s)`);
	}

	/**
	 * Get total count of diagnostics across all documents.
	 */
	private getTotalIssueCount(): number {
		let count = 0;

		// Iterate through all diagnostics in the collection
		this.diagnosticCollection.forEach((uri, diagnostics) => {
			count += diagnostics.length;
		});

		return count;
	}

	/**
	 * Dispose of the status bar item.
	 */
	dispose(): void {
		this.statusBarItem.dispose();
		this.logger.debug('Status bar manager disposed');
	}
}
