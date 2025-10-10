/**
 * Base interface for LLM service providers.
 *
 * LLM services generate human-readable descriptions for docstring elements
 * based on code context. They should implement graceful degradation and
 * timeout handling.
 */

import { ParameterDescriptionContext, DescriptionResult } from './types';

/**
 * Interface for LLM service providers.
 *
 * Implementations should:
 * - Handle timeouts gracefully (return null)
 * - Cache results to minimize API calls
 * - Implement proper error handling
 * - Log failures without throwing
 */
export interface ILLMService {
	/**
	 * Generate description for a function parameter.
	 *
	 * @param context Context about the parameter and function
	 * @returns Generated description or null if failed
	 */
	generateParameterDescription(
		context: ParameterDescriptionContext
	): Promise<DescriptionResult | null>;

	/**
	 * Check if LLM service is currently available.
	 *
	 * @returns True if service can be used
	 */
	isAvailable(): Promise<boolean>;

	/**
	 * Clear the cache of generated descriptions.
	 * Should be called when documents are closed.
	 */
	clearCache(): void;
}
