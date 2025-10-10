/**
 * Handles configuration changes and applies appropriate actions.
 */

import * as vscode from 'vscode';
import { Logger } from '../utils/logger';
import { isEnabled, isLLMEnabled, getLLMTimeout, getLLMProvider } from '../utils/config';
import { LanguageHandlerRegistry } from '../languages';
import { ILLMService, GitHubCopilotLLMService } from '../llm';

export interface ConfigurationHandlerDependencies {
	logger: Logger;
	diagnosticCollection: vscode.DiagnosticCollection;
	languageRegistry: LanguageHandlerRegistry;
	getLLMService: () => ILLMService | undefined;
	setLLMService: (service: ILLMService | undefined) => void;
	analyzeDocument: (document: vscode.TextDocument) => Promise<void>;
	shouldAnalyze: (document: vscode.TextDocument) => boolean;
}

/**
 * Handles configuration change events and applies appropriate actions.
 */
export class ConfigurationHandler {
	constructor(private deps: ConfigurationHandlerDependencies) { }

	/**
	 * Handle configuration change event.
	 */
	handleConfigurationChange(event: vscode.ConfigurationChangeEvent): void {
		if (event.affectsConfiguration('docstringVerifier.enable')) {
			this.handleEnableChange();
		}

		if (event.affectsConfiguration('docstringVerifier.docstringStyle')) {
			this.handleDocstringStyleChange();
		}

		if (
			event.affectsConfiguration('docstringVerifier.pythonPath') ||
			event.affectsConfiguration('docstringVerifier.preferUv')
		) {
			this.handlePythonSettingsChange();
		}

		if (
			event.affectsConfiguration('docstringVerifier.useLLM') ||
			event.affectsConfiguration('docstringVerifier.llmTimeout') ||
			event.affectsConfiguration('docstringVerifier.llmProvider')
		) {
			this.handleLLMSettingsChange();
		}

		// Note: logLevel changes are handled by Logger class internally
	}

	/**
	 * Handle enable/disable setting change.
	 */
	private handleEnableChange(): void {
		this.deps.logger.info('Extension enable/disable setting changed');

		if (isEnabled()) {
			this.deps.logger.info('Extension enabled - analyzing open documents');
			this.reanalyzeDocuments();
		} else {
			this.deps.logger.info('Extension disabled - clearing diagnostics');
			this.deps.diagnosticCollection.clear();
		}
	}

	/**
	 * Handle docstring style setting change.
	 */
	private handleDocstringStyleChange(): void {
		this.deps.logger.info('Docstring style setting changed - clearing Python cache');
		// Only Python has docstring style configuration
		this.deps.languageRegistry.resetCache('python');
		// Re-analyze all open Python documents with new style
		this.reanalyzeDocuments('python');
	}

	/**
	 * Handle Python settings change (pythonPath, preferUv).
	 */
	private handlePythonSettingsChange(): void {
		this.deps.logger.info('Python settings changed - resetting Python cache');
		this.deps.languageRegistry.resetCache('python');
		// Re-analyze all open Python documents
		this.reanalyzeDocuments('python');
	}

	/**
	 * Handle LLM settings change (useLLM, llmTimeout, llmProvider).
	 */
	private handleLLMSettingsChange(): void {
		this.deps.logger.info('LLM settings changed - reinitializing LLM service');

		// Clear existing LLM service
		const currentService = this.deps.getLLMService();
		if (currentService) {
			currentService.clearCache();
			this.deps.setLLMService(undefined);
		}

		// Reinitialize if enabled
		if (isLLMEnabled()) {
			const llmProvider = getLLMProvider();
			const llmTimeout = getLLMTimeout();

			if (llmProvider === 'github-copilot') {
				const newService = new GitHubCopilotLLMService(llmTimeout);
				this.deps.setLLMService(newService);
				this.deps.logger.info(`Reinitialized GitHub Copilot LLM service (timeout: ${llmTimeout}ms)`);
			} else {
				this.deps.logger.warn(`Unknown LLM provider: ${llmProvider}`);
			}
		} else {
			this.deps.logger.info('LLM service disabled in settings');
		}

		// Note: Code Action Providers cannot be dynamically updated after registration
		// User will need to trigger Quick Fixes again to use updated LLM service
		this.deps.logger.info('Please trigger Quick Fixes again to use updated LLM settings');
	}

	/**
	 * Re-analyze all open documents, optionally filtering by language.
	 *
	 * @param languageId Optional language filter (e.g., 'python')
	 */
	private reanalyzeDocuments(languageId?: string): void {
		vscode.workspace.textDocuments.forEach((document) => {
			const shouldAnalyze = this.deps.shouldAnalyze(document);
			const matchesLanguage = !languageId || document.languageId === languageId;

			if (shouldAnalyze && matchesLanguage) {
				this.deps.analyzeDocument(document);
			}
		});
	}
}
