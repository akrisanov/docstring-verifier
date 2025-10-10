/**
 * LLM service module for AI-powered description generation.
 *
 * This module provides interfaces and implementations for integrating
 * Large Language Models into the docstring verification workflow.
 *
 * Current providers:
 * - GitHub Copilot (via VS Code Language Model API)
 *
 * Future providers:
 * - OpenAI GPT-4
 * - Anthropic Claude
 * - Local models (Ollama, llama.cpp)
 */

export { ILLMService } from './base';
export { ParameterDescriptionContext, DescriptionResult } from './types';
export { GitHubCopilotLLMService } from './providers/githubCopilot';
