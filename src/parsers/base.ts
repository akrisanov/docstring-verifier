import * as vscode from 'vscode';
import { FunctionDescriptor } from './types';

/**
 * Base interface for all language parsers.
 * Parsers extract function information from source code.
 */
export interface IParser {
    /**
     * Parse a document and extract function descriptors.
     * @param document The document to parse
     * @returns Array of function descriptors found in the document
     */
    parse(document: vscode.TextDocument): Promise<FunctionDescriptor[]>;

    /**
     * Reset internal caches (e.g., Python executor command cache).
     * Optional method - parsers that don't cache can use default no-op implementation.
     */
    resetExecutor?(): void;
}
