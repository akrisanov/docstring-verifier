import * as vscode from 'vscode';
import { IParser } from '../base';
import { FunctionDescriptor, ParameterDescriptor } from '../types';

/**
 * Mock Python parser for testing the full diagnostic flow.
 * Returns completely synthetic hardcoded function information.
 * Does not actually parse the document - this is purely for testing.
 */
export class MockPythonParser implements IParser {
    async parse(document: vscode.TextDocument): Promise<FunctionDescriptor[]> {
        // Only process Python files
        if (document.languageId !== 'python') {
            return [];
        }

        // Return a completely synthetic function descriptor
        // This simulates a function with parameter 'x' that is missing from docstring
        return [this.createMockFunction()];
    }

    /**
     * Creates a synthetic function descriptor for testing.
     * Simulates: def calculate(x, y) with docstring that only documents 'y'.
     * This should trigger DSV102: PARAM_MISSING_IN_DOCSTRING for parameter 'x'.
     */
    private createMockFunction(): FunctionDescriptor {
        // Mock parameters: 'x' is in code but missing in docstring
        const xParam: ParameterDescriptor = {
            name: 'x',
            type: 'int',
            defaultValue: null,
            isOptional: false,
        };

        const yParam: ParameterDescriptor = {
            name: 'y',
            type: 'int',
            defaultValue: null,
            isOptional: false,
        };

        // Mock function at the beginning of the file
        const mockFunction: FunctionDescriptor = {
            name: 'calculate',
            range: new vscode.Range(0, 0, 10, 0),
            parameters: [xParam, yParam],
            returnType: 'int',
            returnStatements: [
                {
                    type: 'int',
                    line: 5,
                },
            ],
            raises: [],
            // Docstring only mentions 'y', missing 'x'
            docstring: '"""Calculate result.\n\n    Args:\n        y (int): Second number\n\n    Returns:\n        int: The result\n    """',
            docstringRange: new vscode.Range(1, 4, 7, 7),
            hasIO: false,
            hasGlobalMods: false,
        };

        return mockFunction;
    }
}
