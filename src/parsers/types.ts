import * as vscode from 'vscode';

/**
 * Describes a function parameter extracted from code.
 */
export interface ParameterDescriptor {
	name: string;
	type: string | null;
	defaultValue: string | null;
	isOptional: boolean;
	isVarArg?: boolean;
	isKwArg?: boolean;
}

/**
 * Describes a return statement found in code.
 */
export interface ReturnDescriptor {
	type: string | null;
	line: number;
}

/**
 * Describes an exception raised in code.
 */
export interface ExceptionDescriptor {
	type: string;
	line: number;
}

/**
 * Describes a complete function extracted from code.
 * This is the main output of language parsers (Python, TypeScript, etc.)
 */
export interface FunctionDescriptor {
	name: string;
	range: vscode.Range;
	parameters: ParameterDescriptor[];
	returnType: string | null;
	returnStatements: ReturnDescriptor[];
	raises: ExceptionDescriptor[];
	docstring: string | null;
	docstringRange: vscode.Range | null;
	hasIO: boolean;
	hasGlobalMods: boolean;
}
