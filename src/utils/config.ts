import { LogLevel } from './logger';

/**
 * Configuration for the extension.
 * Read from VS Code settings (docstring-verifier.*).
 */
export interface ExtensionConfig {
    enable: boolean;
    logLevel: LogLevel;
    pythonPath: string;
    docstringStyle: 'google' | 'sphinx' | 'auto';
    disabledChecks: string[];
    severityOverrides: Record<string, string>;
}
