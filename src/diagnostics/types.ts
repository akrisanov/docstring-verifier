import * as vscode from 'vscode';

/**
 * Diagnostic codes for different types of mismatches.
 * Organized by category for easy filtering and quick fixes.
 */
export enum DiagnosticCode {
    // Parameter checks (100-199)
    PARAM_MISSING_IN_CODE = 'DSV101',
    PARAM_MISSING_IN_DOCSTRING = 'DSV102',
    PARAM_TYPE_MISMATCH = 'DSV103',
    PARAM_OPTIONAL_MISMATCH = 'DSV104',

    // Return checks (200-299)
    RETURN_TYPE_MISMATCH = 'DSV201',
    RETURN_MISSING_IN_DOCSTRING = 'DSV202',
    RETURN_DOCUMENTED_BUT_VOID = 'DSV203',
    RETURN_MULTIPLE_INCONSISTENT = 'DSV204',
    GENERATOR_SHOULD_YIELD = 'DSV205',

    // Exception checks (300-399)
    EXCEPTION_UNDOCUMENTED = 'DSV301',
    EXCEPTION_NOT_RAISED = 'DSV302',

    // Side effects (400-499)
    SIDE_EFFECT_UNDOCUMENTED = 'DSV401',
}

/**
 * A detected mismatch between code and docstring.
 * This is the main output of analyzers and input to diagnostic provider.
 */
export interface Mismatch {
    code: DiagnosticCode;
    range: vscode.Range;
    message: string;
    severity: vscode.DiagnosticSeverity;
    suggestedFix?: string;
}
