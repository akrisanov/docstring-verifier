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
