/**
 * Types for LLM-powered description generation.
 */

/**
 * Context for generating parameter description.
 */
export interface ParameterDescriptionContext {
	/** Name of the parameter */
	paramName: string;
	/** Type of the parameter (if known) */
	paramType: string | null;
	/** Name of the function containing this parameter */
	functionName: string;
	/** Full function signature for context */
	functionSignature: string;
	/** Function body for understanding parameter usage */
	codeBody: string;
	/** Existing docstring if any */
	existingDocstring?: string;
}

/**
 * Result of LLM description generation.
 */
export interface DescriptionResult {
	/** Generated description */
	description: string;
	/** Whether result came from cache */
	fromCache: boolean;
}
