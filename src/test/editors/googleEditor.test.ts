/**
 * Tests for Google-style docstring editor.
 */

import * as assert from 'assert';
import { GoogleDocstringEditor } from '../../editors/python/googleEditor';
import { ParameterDescriptor } from '../../parsers/types';

suite('GoogleDocstringEditor', () => {
	let editor: GoogleDocstringEditor;

	setup(() => {
		editor = new GoogleDocstringEditor();
	});

	suite('addParameter', () => {
		test('should add parameter in correct order when Args section exists', () => {
			const docstring = `"""Add two numbers.

    Args:
        y (int): Second number

    Returns:
        int: Sum of the numbers
    """`;

			const allParameters: ParameterDescriptor[] = [
				{ name: 'x', type: 'int', isOptional: false, defaultValue: null },
				{ name: 'y', type: 'int', isOptional: false, defaultValue: null }
			];

			const paramToAdd: ParameterDescriptor = {
				name: 'x',
				type: 'int',
				isOptional: false,
				defaultValue: null
			};

			editor.load(docstring);
			editor.addParameter(paramToAdd, undefined, allParameters);
			const result = editor.getText();

			// x should be added BEFORE y
			assert.ok(result.includes('x (int): TODO: Add description'));
			const xIndex = result.indexOf('x (int)');
			const yIndex = result.indexOf('y (int)');
			assert.ok(xIndex < yIndex, 'Parameter x should come before y');

			// Should not create duplicate Args section
			const argsCount = (result.match(/Args:/g) || []).length;
			assert.strictEqual(argsCount, 1, 'Should have only one Args section');
		});

		test('should add parameter after existing one when it comes later in signature', () => {
			const docstring = `"""Function with parameters.

    Args:
        a (str): First parameter

    Returns:
        None
    """`;

			const allParameters: ParameterDescriptor[] = [
				{ name: 'a', type: 'str', isOptional: false, defaultValue: null },
				{ name: 'b', type: 'int', isOptional: false, defaultValue: null },
				{ name: 'c', type: 'bool', isOptional: false, defaultValue: null }
			];

			const paramToAdd: ParameterDescriptor = {
				name: 'b',
				type: 'int',
				isOptional: false,
				defaultValue: null
			};

			editor.load(docstring);
			editor.addParameter(paramToAdd, undefined, allParameters);
			const result = editor.getText();

			const aIndex = result.indexOf('a (str)');
			const bIndex = result.indexOf('b (int)');
			assert.ok(aIndex < bIndex, 'Parameter b should come after a');
		});

		test('should add parameter in middle of existing parameters', () => {
			const docstring = `"""Function with parameters.

    Args:
        a (str): First parameter
        c (bool): Third parameter

    Returns:
        None
    """`;

			const allParameters: ParameterDescriptor[] = [
				{ name: 'a', type: 'str', isOptional: false, defaultValue: null },
				{ name: 'b', type: 'int', isOptional: false, defaultValue: null },
				{ name: 'c', type: 'bool', isOptional: false, defaultValue: null }
			];

			const paramToAdd: ParameterDescriptor = {
				name: 'b',
				type: 'int',
				isOptional: false,
				defaultValue: null
			};

			editor.load(docstring);
			editor.addParameter(paramToAdd, undefined, allParameters);
			const result = editor.getText();

			const aIndex = result.indexOf('a (str)');
			const bIndex = result.indexOf('b (int)');
			const cIndex = result.indexOf('c (bool)');
			assert.ok(aIndex < bIndex, 'Parameter b should come after a');
			assert.ok(bIndex < cIndex, 'Parameter b should come before c');
		});

		test('should create Args section if it does not exist', () => {
			const docstring = `"""Simple function.

    Returns:
        int: A number
    """`;

			const allParameters: ParameterDescriptor[] = [
				{ name: 'x', type: 'int', isOptional: false, defaultValue: null }
			];

			const paramToAdd: ParameterDescriptor = {
				name: 'x',
				type: 'int',
				isOptional: false,
				defaultValue: null
			};

			editor.load(docstring);
			editor.addParameter(paramToAdd, undefined, allParameters);
			const result = editor.getText();

			assert.ok(result.includes('Args:'), 'Should create Args section');
			assert.ok(result.includes('x (int): TODO: Add description'));
		});

		test('should handle Args section without indentation', () => {
			const docstring = `"""Function.

Args:
    x (int): First parameter
"""`;

			const allParameters: ParameterDescriptor[] = [
				{ name: 'x', type: 'int', isOptional: false, defaultValue: null },
				{ name: 'y', type: 'int', isOptional: false, defaultValue: null }
			];

			const paramToAdd: ParameterDescriptor = {
				name: 'y',
				type: 'int',
				isOptional: false,
				defaultValue: null
			};

			editor.load(docstring);
			editor.addParameter(paramToAdd, undefined, allParameters);
			const result = editor.getText();

			assert.ok(result.includes('y (int): TODO: Add description'));
			const argsCount = (result.match(/Args:/g) || []).length;
			assert.strictEqual(argsCount, 1, 'Should have only one Args section');
		});
	});

	suite('parseStructure', () => {
		test('should parse Args section with indentation', () => {
			const docstring = `"""Function.

    Args:
        x (int): Parameter
    """`;

			editor.load(docstring);
			const result = editor.getText();

			// If parsing works, we should be able to get the text back unchanged
			assert.strictEqual(result, docstring);
		});

		test('should parse Args section without indentation', () => {
			const docstring = `"""Function.

Args:
    x (int): Parameter
"""`;

			editor.load(docstring);
			const result = editor.getText();

			assert.strictEqual(result, docstring);
		});
	});
});
