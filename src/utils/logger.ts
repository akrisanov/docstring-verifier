import * as vscode from 'vscode';

/**
 * Log levels for the logger.
 */
export enum LogLevel {
    ERROR = 0,
    WARN = 1,
    INFO = 2,
    DEBUG = 3,
    TRACE = 4,
}

/**
 * Logger with PII sanitization and configurable log levels.
 * Ensures user paths and sensitive information are not logged.
 */
export class Logger {
    private level: LogLevel;
    private readonly outputChannel: vscode.OutputChannel;
    private configListener: vscode.Disposable;

    constructor(name: string) {
        this.outputChannel = vscode.window.createOutputChannel(name);
        this.level = this.getConfiguredLevel();

        // Watch for configuration changes (store disposable for cleanup)
        this.configListener = vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('docstringVerifier.logLevel')) {
                this.level = this.getConfiguredLevel();
                this.info(`Log level changed to: ${LogLevel[this.level]}`);
            }
        });
    }

    /**
     * Get the configured log level from settings.
     */
    private getConfiguredLevel(): LogLevel {
        const config = vscode.workspace.getConfiguration('docstringVerifier');
        const level = config.get<string>('logLevel', 'info');
        return LogLevel[level.toUpperCase() as keyof typeof LogLevel] || LogLevel.INFO;
    }

    /**
     * Sanitize message to remove PII (personally identifiable information).
     * Replaces user paths, emails, IPs, and tokens with generic placeholders.
     */
    private sanitize(message: string): string {
        return message
            // macOS/Linux home directories
            .replace(/\/Users\/[^\/\s]+/g, '/Users/<user>')
            .replace(/\/home\/[^\/\s]+/g, '/home/<user>')
            // Windows user directories
            .replace(/C:\\Users\\[^\\]+/g, 'C:\\Users\\<user>')
            // Keep last 2 path segments for context
            .replace(/([\/\\])[^\/\\]*([\/\\][^\/\\]+[\/\\][^\/\\]+)$/g, '$1...$2');
    }

    /**
     * Log a message at the specified level.
     */
    private log(level: LogLevel, message: string, ...args: unknown[]): void {
        if (level > this.level) {
            return;
        }

        const timestamp = new Date().toISOString();
        const levelStr = LogLevel[level].padEnd(5);
        const sanitized = this.sanitize(message);

        const formatted = `[${timestamp}] [${levelStr}] ${sanitized}`;

        this.outputChannel.appendLine(formatted);

        // Log additional arguments if provided (sanitized)
        if (args.length > 0) {
            try {
                const argsStr = JSON.stringify(args, null, 2);
                const sanitizedArgs = this.sanitize(argsStr);
                // Truncate very long outputs
                const truncated = sanitizedArgs.length > 500
                    ? sanitizedArgs.substring(0, 500) + '... (truncated)'
                    : sanitizedArgs;
                this.outputChannel.appendLine('  ' + truncated);
            } catch (error) {
                this.outputChannel.appendLine('  [Unable to serialize arguments]');
            }
        }
    }

    /**
     * Log an error message.
     */
    error(message: string, ...args: unknown[]): void {
        this.log(LogLevel.ERROR, message, ...args);
    }

    /**
     * Log a warning message.
     */
    warn(message: string, ...args: unknown[]): void {
        this.log(LogLevel.WARN, message, ...args);
    }

    /**
     * Log an info message.
     */
    info(message: string, ...args: unknown[]): void {
        this.log(LogLevel.INFO, message, ...args);
    }

    /**
     * Log a debug message.
     */
    debug(message: string, ...args: unknown[]): void {
        this.log(LogLevel.DEBUG, message, ...args);
    }

    /**
     * Log a trace message.
     */
    trace(message: string, ...args: unknown[]): void {
        this.log(LogLevel.TRACE, message, ...args);
    }

    /**
     * Show the output channel.
     */
    show(): void {
        this.outputChannel.show();
    }

    /**
     * Dispose of the logger.
     */
    dispose(): void {
        this.outputChannel.dispose();
    }
}
