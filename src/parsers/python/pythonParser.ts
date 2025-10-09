import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { IParser } from '../base';
import { FunctionDescriptor } from '../types';
import { PythonExecutor } from './pythonExecutor';
import { Logger } from '../../utils/logger';

/**
 * Parser for Python files using the Python AST extractor.
 *
 * This parser executes the ast_extractor.py script to analyze Python files
 * and extract function metadata including parameters, return types, exceptions,
 * and docstrings.
 */
export class PythonParser implements IParser {
	private executor: PythonExecutor;
	private logger: Logger;
	private astExtractorPath: string;

	constructor(context: vscode.ExtensionContext) {
		this.logger = new Logger('Docstring Verifier - Python Parser');
		this.executor = new PythonExecutor(context);

		// Construct path to ast_extractor.py
		this.astExtractorPath = context.asAbsolutePath(
			path.join('tools', 'python', 'ast_extractor.py')
		);

		this.logger.info('Python Parser initialized');
		this.logger.debug(`AST Extractor path: ${this.astExtractorPath}`);

		// Validate that ast_extractor.py exists
		if (!fs.existsSync(this.astExtractorPath)) {
			this.logger.error(`AST Extractor not found at: ${this.astExtractorPath}`);
			this.logger.error('Python parsing will not work correctly');
		}
	}

	/**
	 * Parse a Python document and extract function metadata.
	 *
	 * @param document The VS Code document to parse
	 * @returns Array of function descriptors with metadata
	 */
	async parse(document: vscode.TextDocument): Promise<FunctionDescriptor[]> {
		// Validate that the document is a Python file
		if (document.languageId !== 'python') {
			this.logger.warn(`Attempted to parse non-Python file: ${document.uri.fsPath}`);
			return [];
		}

		// Validate that the file exists on disk (not an untitled document)
		if (document.uri.scheme !== 'file') {
			this.logger.warn(`Attempted to parse non-file document: ${document.uri.toString()}`);
			return [];
		}

		const filePath = document.uri.fsPath;
		this.logger.debug(`Parsing Python file: ${filePath}`);

		try {
			// Execute ast_extractor.py with the file path
			const pythonOutput = await this.executor.executeJson<PythonASTResult>(
				this.astExtractorPath,
				[filePath]
			);

			if (!pythonOutput) {
				this.logger.error(`No result from ast_extractor.py for ${filePath}`);
				return [];
			}

			if (!pythonOutput.success) {
				this.logger.error(`Failed to parse ${filePath}: ${pythonOutput.error || 'Unknown error'}`);
				return [];
			}

			if (!Array.isArray(pythonOutput.functions)) {
				this.logger.error(`Invalid output from ast_extractor.py: functions field is not an array`);
				return [];
			}

			// Convert Python output to VS Code FunctionDescriptor format
			const functions = pythonOutput.functions.map((func: PythonFunctionDescriptor) =>
				this.convertToFunctionDescriptor(func, document)
			);

			this.logger.info(`Parsed ${functions.length} functions from ${filePath}`);
			return functions;

		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.logger.error(`Error parsing Python file: ${errorMessage}`);
			return [];
		}
	}

	/**
	 * Convert Python AST extractor output to VS Code FunctionDescriptor.
	 *
	 * The Python output already uses camelCase and VS Code Range format.
	 * We validate and ensure the ranges are valid for the document.
	 *
	 * @param pythonFunc Function descriptor from Python AST extractor
	 * @param document VS Code document for range validation
	 * @returns FunctionDescriptor compatible with VS Code
	 */
	private convertToFunctionDescriptor(
		pythonFunc: PythonFunctionDescriptor,
		document: vscode.TextDocument
	): FunctionDescriptor {
		return {
			name: pythonFunc.name,
			range: this.createRange(pythonFunc.range, document),
			parameters: pythonFunc.parameters.map(param => ({
				name: param.name,
				type: param.type,
				defaultValue: param.defaultValue,
				isOptional: param.isOptional,  // Use value from Python AST extractor
				isVarArg: param.isVarArg,
				isKwArg: param.isKwArg,
			})),
			returnType: pythonFunc.returnType,
			returnStatements: pythonFunc.returnStatements.map(ret => ({
				type: ret.type,
				line: ret.line,
			})),
			yieldStatements: pythonFunc.yieldStatements.map(y => ({
				type: y.type,
				line: y.line,
			})),
			isGenerator: pythonFunc.isGenerator,
			isAsync: pythonFunc.isAsync,
			raises: pythonFunc.raises.map(exc => ({
				type: exc.type,
				line: exc.line,
			})),
			docstring: pythonFunc.docstring,
			docstringRange: pythonFunc.docstringRange ?
				this.createRange(pythonFunc.docstringRange, document) : null,
			hasIO: pythonFunc.hasIO,
			hasGlobalMods: pythonFunc.hasGlobalMods,
		};
	}

	/**
	 * Create a VS Code Range from Python range data.
	 *
	 * Python AST extractor already outputs VS Code Range format (0-based indexing),
	 * but we validate and clamp the values to ensure they're within document bounds.
	 *
	 * @param rangeData Range data from Python (with start/end line/character)
	 * @param document VS Code document for validation
	 * @returns Valid VS Code Range
	 */
	private createRange(
		rangeData: { start: { line: number; character: number }; end: { line: number; character: number } },
		document: vscode.TextDocument
	): vscode.Range {
		// Clamp line numbers to document bounds
		const startLine = Math.max(0, Math.min(rangeData.start.line, document.lineCount - 1));
		const endLine = Math.max(0, Math.min(rangeData.end.line, document.lineCount - 1));

		// Clamp character positions to line length
		const startChar = Math.max(0, Math.min(
			rangeData.start.character,
			document.lineAt(startLine).text.length
		));
		const endChar = Math.max(0, Math.min(
			rangeData.end.character,
			document.lineAt(endLine).text.length
		));

		return new vscode.Range(startLine, startChar, endLine, endChar);
	}
}

/**
 * Output format from Python ast_extractor.py
 */
interface PythonASTResult {
	success: boolean;
	file: string;
	functions: PythonFunctionDescriptor[];
	error?: string;  // Present if success is false
}

/**
 * Function descriptor from Python AST extractor (camelCase format).
 * This matches the exact output from FunctionDescriptor.to_dict() in ast_extractor.py
 */
interface PythonFunctionDescriptor {
	name: string;
	range: { start: { line: number; character: number }; end: { line: number; character: number } };
	parameters: Array<{
		name: string;
		type: string | null;
		defaultValue: string | null;
		isOptional: boolean;
		isVarArg: boolean;
		isKwArg: boolean;
	}>;
	returnType: string | null;
	returnStatements: Array<{
		type: string | null;
		line: number;
	}>;
	yieldStatements: Array<{
		type: string | null;
		line: number;
	}>;
	isGenerator: boolean;
	isAsync: boolean;
	raises: Array<{
		type: string;
		line: number;
	}>;
	docstring: string | null;
	docstringRange: { start: { line: number; character: number }; end: { line: number; character: number } } | null;
	hasIO: boolean;
	hasGlobalMods: boolean;
}
