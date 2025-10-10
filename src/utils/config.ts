import * as vscode from 'vscode';
import { LogLevel } from './logger';

/**
 * Configuration for the extension.
 * Read from VS Code settings (docstringVerifier.*).
 */
export interface ExtensionConfig {
	enable: boolean;
	logLevel: LogLevel;
	pythonPath: string;
	pythonScriptPath: string;
	preferUv: boolean;
	docstringStyle: 'auto' | 'google' | 'sphinx';
	useLLM: boolean;
	llmTimeout: number;
	llmProvider: 'github-copilot';
}

/**
 * Get extension configuration from VS Code settings
 */
export function getConfig(): ExtensionConfig {
	const config = vscode.workspace.getConfiguration('docstringVerifier');

	// Parse log level from string to enum
	const logLevelStr = config.get<string>('logLevel', 'info');
	const logLevel = LogLevel[logLevelStr.toUpperCase() as keyof typeof LogLevel] || LogLevel.INFO;

	return {
		enable: config.get<boolean>('enable', true),
		logLevel: logLevel,
		pythonPath: config.get<string>('pythonPath', ''),
		pythonScriptPath: config.get<string>('pythonScriptPath', ''),
		preferUv: config.get<boolean>('preferUv', true),
		docstringStyle: config.get<'auto' | 'google' | 'sphinx'>('docstringStyle', 'auto'),
		useLLM: config.get<boolean>('useLLM', true),
		llmTimeout: config.get<number>('llmTimeout', 5000),
		llmProvider: config.get<'github-copilot'>('llmProvider', 'github-copilot'),
	};
}

/**
 * Check if extension is enabled
 */
export function isEnabled(): boolean {
	return getConfig().enable;
}

/**
 * Get docstring style from settings
 */
export function getDocstringStyle(): 'auto' | 'google' | 'sphinx' {
	return getConfig().docstringStyle;
}

/**
 * Check if LLM is enabled
 */
export function isLLMEnabled(): boolean {
	return getConfig().useLLM;
}

/**
 * Get LLM timeout in milliseconds
 */
export function getLLMTimeout(): number {
	return getConfig().llmTimeout;
}

/**
 * Get LLM provider
 */
export function getLLMProvider(): 'github-copilot' {
	return getConfig().llmProvider;
}
