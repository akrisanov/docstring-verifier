/**
 * GitHub Copilot LLM service provider.
 *
 * Uses VS Code's built-in Language Model API to generate descriptions
 * via GitHub Copilot. Requires GitHub Copilot extension to be installed
 * and authenticated.
 */

import * as vscode from 'vscode';
import { Logger } from '../../utils/logger';
import { LRUCache } from '../../utils/lruCache';
import { ILLMService } from '../base';
import { ParameterDescriptionContext, DescriptionResult } from '../types';

/**
 * System prompt for GitHub Copilot.
 * Instructs the model on how to generate parameter descriptions.
 */
const SYSTEM_PROMPT = `You are a technical documentation expert. Generate concise,
accurate parameter descriptions for function docstrings.

Requirements:
- One sentence, maximum 80 characters
- Start with a verb or noun (not "The parameter...")
- Be specific about what the parameter represents
- Don't repeat the parameter name
- Don't use markdown or special formatting
- Focus on the parameter's purpose and usage

Examples of good descriptions:
- "Maximum number of retries before giving up"
- "Path to the configuration file"
- "Callback function invoked on completion"
- "Timeout in seconds for the operation"
- "User ID to fetch data for"`;

/**
 * GitHub Copilot LLM service implementation.
 *
 * Features:
 * - Uses VS Code Language Model API (vscode.lm)
 * - LRU cache with 1000 item limit to minimize API calls
 * - 5-second timeout for requests
 * - Graceful fallback on errors
 * - No API key management needed (uses VS Code auth)
 */
export class GitHubCopilotLLMService implements ILLMService {
	private logger: Logger;
	private cache: LRUCache<string, string>;
	private timeout: number;

	/**
	 * Create GitHub Copilot LLM service.
	 *
	 * @param timeout Timeout in milliseconds for LLM requests (default: 5000)
	 * @param cacheSize Maximum number of cached descriptions (default: 1000)
	 */
	constructor(timeout: number = 5000, cacheSize: number = 1000) {
		this.logger = new Logger('Docstring Verifier - LLM Service (GitHub Copilot)');
		this.cache = new LRUCache(cacheSize);
		this.timeout = timeout;
		this.logger.info(`GitHub Copilot LLM service initialized (cache size: ${cacheSize})`);
	}

	/**
	 * Generate description for a parameter using GitHub Copilot.
	 *
	 * Process:
	 * 1. Check cache first
	 * 2. Build context-aware prompt
	 * 3. Call Copilot API with timeout
	 * 4. Validate and clean response
	 * 5. Cache result
	 *
	 * @param context Parameter and function context
	 * @returns Generated description or null if failed
	 */
	async generateParameterDescription(
		context: ParameterDescriptionContext
	): Promise<DescriptionResult | null> {
		// Check cache first
		const cacheKey = this.getCacheKey(context);
		const cached = this.cache.get(cacheKey);

		if (cached) {
			this.logger.debug(`Using cached description for parameter '${context.paramName}'`);
			return {
				description: cached,
				fromCache: true,
			};
		}

		try {
			// Check if Copilot is available
			if (!await this.isAvailable()) {
				this.logger.warn('GitHub Copilot not available');
				return null;
			}

			this.logger.debug(`Generating description for parameter '${context.paramName}' in ${context.functionName}()`);

			// Generate description with timeout
			const description = await this.generateWithTimeout(context);

			if (!description) {
				this.logger.warn(`Failed to generate description for '${context.paramName}' (timeout or error)`);
				return null;
			}

			// Cache successful result
			this.cache.set(cacheKey, description);
			this.logger.trace(`Generated and cached description for '${context.paramName}': "${description}"`);

			return {
				description,
				fromCache: false,
			};

		} catch (error) {
			this.logger.error(
				`Error generating description for '${context.paramName}': ${error instanceof Error ? error.message : String(error)
				}`
			);
			return null;
		}
	}

	/**
	 * Check if GitHub Copilot is available.
	 *
	 * Requirements:
	 * - GitHub Copilot extension installed
	 * - Extension activated
	 * - Language Model API available (VS Code 1.85+)
	 *
	 * @returns True if Copilot can be used
	 */
	async isAvailable(): Promise<boolean> {
		try {
			// Check if Language Model API exists (VS Code 1.85+)
			if (!vscode.lm) {
				this.logger.debug('Language Model API not available (VS Code version too old)');
				return false;
			}

			// Check if GitHub Copilot extension is installed and active
			const copilotExtension = vscode.extensions.getExtension('github.copilot');
			if (!copilotExtension) {
				this.logger.debug('GitHub Copilot extension not installed');
				return false;
			}

			if (!copilotExtension.isActive) {
				this.logger.debug('GitHub Copilot extension not activated');
				return false;
			}

			// Check if Copilot models are available
			const models = await vscode.lm.selectChatModels({
				vendor: 'copilot',
				family: 'gpt-4o'
			});

			if (models.length === 0) {
				this.logger.debug('No GitHub Copilot models available');
				return false;
			}

			return true;

		} catch (error) {
			this.logger.warn(`Error checking Copilot availability: ${error instanceof Error ? error.message : String(error)
				}`);
			return false;
		}
	}

	/**
	 * Clear cached descriptions.
	 * Should be called when documents are closed or workspace changes.
	 */
	clearCache(): void {
		const size = this.cache.size;
		this.cache.clear();
		this.logger.trace(`Cleared LLM cache (${size} entries)`);
	}

	/**
	 * Generate description with timeout protection.
	 *
	 * @param context Parameter context
	 * @returns Description or null if timeout/error
	 */
	private async generateWithTimeout(
		context: ParameterDescriptionContext
	): Promise<string | null> {
		// Create cancellation token for timeout control
		const cancellation = new vscode.CancellationTokenSource();

		// Set timeout to cancel the request
		const timeoutId = setTimeout(() => {
			cancellation.cancel();
			this.logger.debug(`Request timeout (${this.timeout}ms) for parameter '${context.paramName}'`);
		}, this.timeout);

		try {
			// Call API with cancellation support
			const result = await this.callCopilotAPI(context, cancellation.token);
			return result;
		} finally {
			clearTimeout(timeoutId);
			cancellation.dispose();
		}
	}

	/**
	 * Call GitHub Copilot API to generate description.
	 *
	 * @param context Parameter context
	 * @param cancellationToken Token to cancel the request
	 * @returns Generated description or null
	 */
	private async callCopilotAPI(
		context: ParameterDescriptionContext,
		cancellationToken: vscode.CancellationToken
	): Promise<string | null> {
		try {
			// Select Copilot model
			const models = await vscode.lm.selectChatModels({
				vendor: 'copilot',
				family: 'gpt-4o'
			});

			if (models.length === 0) {
				return null;
			}

			const model = models[0];

			// Build prompt
			const userPrompt = this.buildPrompt(context);

			// Send chat request with cancellation token
			const messages = [
				vscode.LanguageModelChatMessage.User(SYSTEM_PROMPT),
				vscode.LanguageModelChatMessage.User(userPrompt)
			];

			const response = await model.sendRequest(messages, {}, cancellationToken);

			// Collect response text
			let fullText = '';
			for await (const chunk of response.text) {
				fullText += chunk;
			}

			// Extract and validate description
			return this.extractDescription(fullText);

		} catch (error) {
			// Check if error is due to cancellation
			if (error instanceof vscode.CancellationError) {
				this.logger.debug('Copilot API call was cancelled (timeout)');
				return null;
			}

			this.logger.error(`Copilot API call failed: ${error instanceof Error ? error.message : String(error)
				}`);
			return null;
		}
	}	/**
	 * Build prompt for Copilot with context.
	 *
	 * @param context Parameter context
	 * @returns Formatted prompt
	 */
	private buildPrompt(context: ParameterDescriptionContext): string {
		const lines = [
			`Generate a description for parameter '${context.paramName}' in function '${context.functionName}'.`,
			'',
			'Function signature:',
			context.functionSignature,
			''
		];

		if (context.paramType) {
			lines.push(`Parameter type: ${context.paramType}`);
			lines.push('');
		}

		lines.push('Function code:');
		lines.push(context.codeBody);

		if (context.existingDocstring) {
			lines.push('');
			lines.push('Existing docstring:');
			lines.push(context.existingDocstring);
		}

		lines.push('');
		lines.push('Generate a concise description (one sentence, max 80 chars):');

		return lines.join('\n');
	}

	/**
	 * Extract and validate description from API response.
	 *
	 * @param response Raw API response
	 * @returns Clean description or null if invalid
	 */
	private extractDescription(response: string): string | null {
		if (!response) {
			return null;
		}

		// Clean up response
		let cleaned = response.trim();

		// Remove quotes if present
		if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
			cleaned = cleaned.slice(1, -1);
		}
		if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
			cleaned = cleaned.slice(1, -1);
		}

		// Remove common prefixes
		const prefixes = [
			'Description: ',
			'Parameter description: ',
			'The parameter ',
			'This parameter '
		];

		for (const prefix of prefixes) {
			if (cleaned.toLowerCase().startsWith(prefix.toLowerCase())) {
				cleaned = cleaned.slice(prefix.length);
				// Capitalize first letter
				cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
			}
		}

		// Validate length
		if (cleaned.length === 0) {
			return null;
		}

		if (cleaned.length > 200) {
			this.logger.warn(`Description too long (${cleaned.length} chars), truncating`);
			cleaned = cleaned.slice(0, 197) + '...';
		}

		// Ensure it ends with period
		if (!cleaned.endsWith('.') && !cleaned.endsWith('!') && !cleaned.endsWith('?')) {
			cleaned += '.';
		}

		return cleaned;
	}

	/**
	 * Generate cache key for a parameter context.
	 *
	 * @param context Parameter context
	 * @returns Cache key
	 */
	private getCacheKey(context: ParameterDescriptionContext): string {
		// Cache by function name, parameter name, and type
		// This allows reuse across similar functions
		return `${context.functionName}:${context.paramName}:${context.paramType || 'Any'}`;
	}

	/**
	 * Create a promise that rejects after timeout.
	 *
	 * @returns Promise that resolves to null after timeout
	 */
	private createTimeoutPromise(): Promise<null> {
		return new Promise((resolve) => {
			setTimeout(() => resolve(null), this.timeout);
		});
	}
}
