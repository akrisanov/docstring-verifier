/**
 * Types for Code Action providers and fixes.
 */

import * as vscode from 'vscode';
import { FunctionDescriptor } from '../parsers/types';
import { DiagnosticCode } from '../diagnostics/types';

/**
 * Context for creating code actions.
 * Contains all information needed to generate a fix.
 */
export interface CodeActionContext {
    document: vscode.TextDocument;
    diagnostic: vscode.Diagnostic;
    function: FunctionDescriptor;
}

/**
 * Interface for code action fix providers.
 * Each fix provider handles specific diagnostic codes.
 */
export interface ICodeActionProvider {
    /**
     * Check if this provider can handle the given diagnostic.
     */
    canProvide(diagnostic: vscode.Diagnostic): boolean;

    /**
     * Provide code actions for the diagnostic.
     */
    provideCodeActions(context: CodeActionContext): vscode.CodeAction[];
}

/**
 * Metadata for registering code action providers.
 */
export interface CodeActionProviderMetadata {
    providedCodeActionKinds: vscode.CodeActionKind[];
    supportedDiagnosticCodes: DiagnosticCode[];
}
