/**
 * Test utilities for analyzer tests.
 * Shared helper functions to create test fixtures.
 */

import * as vscode from 'vscode';
import { FunctionDescriptor, ParameterDescriptor } from '../../../parsers/types';
import {
	DocstringDescriptor,
	DocstringParameterDescriptor,
	DocstringReturnDescriptor,
	DocstringExceptionDescriptor,
} from '../../../docstring/types';

/**
 * Default test range for test fixtures
 */
export const TEST_RANGE = new vscode.Range(0, 0, 10, 0);

/**
 * Mock URI for tests
 */
export const TEST_URI = vscode.Uri.parse('file:///test/file.py');

/**
 * Options for creating a FunctionDescriptor
 */
export interface CreateFunctionOptions {
	name?: string;
	range?: vscode.Range;
	parameters?: ParameterDescriptor[];
	returnType?: string | null;
	returnStatements?: Array<{ type: string | null; line: number }>;
	yieldStatements?: Array<{ type: string | null; line: number }>;
	isGenerator?: boolean;
	isAsync?: boolean;
	raises?: Array<{ type: string; line: number }>;
	docstring?: string | null;
	docstringRange?: vscode.Range | null;
	hasIO?: boolean;
	hasGlobalMods?: boolean;
}

/**
 * Create a minimal FunctionDescriptor for testing
 */
export function createTestFunction(options: CreateFunctionOptions = {}): FunctionDescriptor {
	return {
		name: options.name ?? 'test_func',
		range: options.range ?? TEST_RANGE,
		parameters: options.parameters ?? [],
		returnType: options.returnType ?? null,
		returnStatements: options.returnStatements ?? [],
		yieldStatements: options.yieldStatements ?? [],
		isGenerator: options.isGenerator ?? false,
		isAsync: options.isAsync ?? false,
		raises: options.raises ?? [],
		docstring: 'docstring' in options ? options.docstring! : 'Test',
		docstringRange: 'docstringRange' in options ? options.docstringRange! : TEST_RANGE,
		hasIO: options.hasIO ?? false,
		hasGlobalMods: options.hasGlobalMods ?? false,
	};
}

/**
 * Options for creating a DocstringDescriptor
 */
export interface CreateDocstringOptions {
	parameters?: DocstringParameterDescriptor[];
	returns?: DocstringReturnDescriptor | null;
	returnType?: string | null;  // Shorthand for returns.type
	returnDescription?: string;   // Shorthand for returns.description
	raises?: DocstringExceptionDescriptor[];
	notes?: string | null;
}

/**
 * Create a minimal DocstringDescriptor for testing
 */
export function createTestDocstring(options: CreateDocstringOptions = {}): DocstringDescriptor {
	// Use explicit returns if provided, otherwise build from shorthand
	let returns = options.returns;
	if (!returns && (options.returnType !== undefined || options.returnDescription !== undefined)) {
		returns = {
			type: options.returnType ?? null,
			description: options.returnDescription ?? '',
		};
	}

	return {
		parameters: options.parameters ?? [],
		returns: returns ?? null,
		raises: options.raises ?? [],
		notes: options.notes ?? null,
	};
}

/**
 * Create a test parameter
 */
export function createTestParameter(
	name: string,
	type: string | null = null,
	defaultValue: string | null = null,
	isOptional: boolean = false
): ParameterDescriptor {
	return {
		name,
		type,
		defaultValue,
		isOptional,
	};
}

/**
 * Create a test docstring parameter
 */
export function createTestDocstringParameter(
	name: string,
	type: string | null = null,
	description: string = '',
	isOptional?: boolean
): DocstringParameterDescriptor {
	return {
		name,
		type,
		description,
		isOptional,
	};
}
