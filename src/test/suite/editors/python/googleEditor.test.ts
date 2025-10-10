/**
 * Tests for GoogleDocstringEditor.
 */

import * as assert from 'assert';
import { GoogleDocstringEditor } from '../../../../editors/python/googleEditor';
import { ParameterDescriptor } from '../../../../parsers/types';

suite('GoogleDocstringEditor Tests', () => {

	suite('Load and Parse', () => {

		test('Should load simple docstring', () => {
			const editor = new GoogleDocstringEditor();
			const docstring = `"""Simple function.

Args:
    x (int): First number

Returns:
    int: Sum
"""`;

			editor.load(docstring);
			const result = editor.getText();

			assert.strictEqual(result, docstring);
		});
	});

	suite('Add Parameter', () => {

		test('Should add parameter to existing Args section', () => {
			const editor = new GoogleDocstringEditor();
			const docstring = `"""Add two numbers.

Args:
    x (int): First number
"""`;

			editor.load(docstring);

			const param: ParameterDescriptor = {
				name: 'y',
				type: 'int',
				defaultValue: null,
				isOptional: false,
			}; editor.addParameter(param);
			const result = editor.getText();

			assert.ok(result.includes('y (int): TODO: Add description'));
			assert.ok(result.includes('x (int): First number'));
		});

		test('Should create Args section if missing', () => {
			const editor = new GoogleDocstringEditor();
			const docstring = `"""Simple function.

Returns:
    int: Result
"""`;

			editor.load(docstring);

			const param: ParameterDescriptor = {
				name: 'x',
				type: 'int',
				defaultValue: null,
				isOptional: false,
			}; editor.addParameter(param);
			const result = editor.getText();

			assert.ok(result.includes('Args:'));
			assert.ok(result.includes('x (int): TODO: Add description'));
		});

		test('Should not add duplicate parameter', () => {
			const editor = new GoogleDocstringEditor();
			const docstring = `"""Add numbers.

Args:
    x (int): First number
"""`;

			editor.load(docstring);

			const param: ParameterDescriptor = {
				name: 'x',
				type: 'str',
				defaultValue: null,
				isOptional: false,
			}; editor.addParameter(param);
			const result = editor.getText();

			// Should not have two 'x' parameters
			const matches = result.match(/x \(/g);
			assert.strictEqual(matches?.length, 1);
		});
	});

	suite('Remove Parameter', () => {

		test('Should remove parameter from Args section', () => {
			const editor = new GoogleDocstringEditor();
			const docstring = `"""Add numbers.

Args:
    x (int): First number
    y (int): Second number
"""`;

			editor.load(docstring);
			editor.removeParameter('y');
			const result = editor.getText();

			assert.ok(!result.includes('y (int)'));
			assert.ok(result.includes('x (int): First number'));
		});

		test('Should handle removing non-existent parameter', () => {
			const editor = new GoogleDocstringEditor();
			const docstring = `"""Add numbers.

Args:
    x (int): First number
"""`;

			editor.load(docstring);
			editor.removeParameter('z');
			const result = editor.getText();

			// Should remain unchanged
			assert.ok(result.includes('x (int): First number'));
		});
	});

	suite('Update Parameter Type', () => {

		test('Should update parameter type', () => {
			const editor = new GoogleDocstringEditor();
			const docstring = `"""Function.

Args:
    x (int): A number
"""`;

			editor.load(docstring);
			editor.updateParameterType('x', 'str');
			const result = editor.getText();

			assert.ok(result.includes('x (str): A number'));
			assert.ok(!result.includes('x (int)'));
		});
	});

	suite('Update Parameter Optional', () => {

		test('Should add optional marker', () => {
			const editor = new GoogleDocstringEditor();
			const docstring = `"""Function.

Args:
    x (int): A number
"""`;

			editor.load(docstring);
			editor.updateParameterOptional('x', true);
			const result = editor.getText();

			assert.ok(result.includes('optional'));
		});

		test('Should remove optional marker', () => {
			const editor = new GoogleDocstringEditor();
			const docstring = `"""Function.

Args:
    x (int): optional. A number
"""`;

			editor.load(docstring);
			editor.updateParameterOptional('x', false);
			const result = editor.getText();

			assert.ok(!result.includes('optional'));
			assert.ok(result.includes('A number'));
		});
	});

	suite('Add Return', () => {

		test('Should add Returns section', () => {
			const editor = new GoogleDocstringEditor();
			const docstring = `"""Function.

Args:
    x (int): A number
"""`;

			editor.load(docstring);
			editor.addReturn('int', 'The result');
			const result = editor.getText();

			assert.ok(result.includes('Returns:'));
			assert.ok(result.includes('int: The result'));
		});

		test('Should use default description if not provided', () => {
			const editor = new GoogleDocstringEditor();
			const docstring = `"""Function."""`;

			editor.load(docstring);
			editor.addReturn('str');
			const result = editor.getText();

			assert.ok(result.includes('Returns:'));
			assert.ok(result.includes('str: TODO: Add description'));
		});
	});

	suite('Remove Return', () => {

		test('Should remove Returns section', () => {
			const editor = new GoogleDocstringEditor();
			const docstring = `"""Function.

Returns:
    int: Result
"""`;

			editor.load(docstring);
			editor.removeReturn();
			const result = editor.getText();

			assert.ok(!result.includes('Returns:'));
			assert.ok(!result.includes('int: Result'));
		});
	});

	suite('Update Return Type', () => {

		test('Should update return type', () => {
			const editor = new GoogleDocstringEditor();
			const docstring = `"""Function.

Returns:
    int: The result
"""`;

			editor.load(docstring);
			editor.updateReturnType('str');
			const result = editor.getText();

			assert.ok(result.includes('str: The result'));
			assert.ok(!result.includes('int:'));
		});
	});

	suite('Add Exception', () => {

		test('Should add exception to existing Raises section', () => {
			const editor = new GoogleDocstringEditor();
			const docstring = `"""Function.

Raises:
    ValueError: If invalid
"""`;

			editor.load(docstring);
			editor.addException('TypeError', 'If wrong type');
			const result = editor.getText();

			assert.ok(result.includes('TypeError: If wrong type'));
			assert.ok(result.includes('ValueError: If invalid'));
		});

		test('Should create Raises section if missing', () => {
			const editor = new GoogleDocstringEditor();
			const docstring = `"""Function.

Args:
    x (int): Number
"""`;

			editor.load(docstring);
			editor.addException('ValueError');
			const result = editor.getText();

			assert.ok(result.includes('Raises:'));
			assert.ok(result.includes('ValueError: TODO: Add description'));
		});
	});

	suite('Remove Exception', () => {

		test('Should remove exception from Raises section', () => {
			const editor = new GoogleDocstringEditor();
			const docstring = `"""Function.

Raises:
    ValueError: If invalid
    TypeError: If wrong type
"""`;

			editor.load(docstring);
			editor.removeException('TypeError');
			const result = editor.getText();

			assert.ok(!result.includes('TypeError'));
			assert.ok(result.includes('ValueError: If invalid'));
		});
	});

	suite('Complex Scenarios', () => {

		test('Should handle multiple operations', () => {
			const editor = new GoogleDocstringEditor();
			const docstring = `"""Add numbers.

Args:
    x (int): First number
"""`;

			editor.load(docstring);

			// Add parameter
			editor.addParameter({ name: 'y', type: 'int', defaultValue: null, isOptional: false });            // Add return
			editor.addReturn('int', 'Sum of x and y');

			// Add exception
			editor.addException('ValueError', 'If invalid input');

			const result = editor.getText();

			assert.ok(result.includes('y (int): TODO: Add description'));
			assert.ok(result.includes('Returns:'));
			assert.ok(result.includes('int: Sum of x and y'));
			assert.ok(result.includes('Raises:'));
			assert.ok(result.includes('ValueError: If invalid input'));
		});
	});

	suite('Parameter Name Matching', () => {
		test('Should not match parameter name as substring', () => {
			const editor = new GoogleDocstringEditor();
			const docstring = `"""Function.

Args:
    xyz (int): Parameter xyz
"""`;

			editor.load(docstring);

			// Try to find parameter 'x' - should NOT find 'xyz'
			editor.removeParameter('x');
			const result = editor.getText();

			// 'xyz' should still be there
			assert.ok(result.includes('xyz (int): Parameter xyz'));
		});

		test('Should handle parameter names with underscores', () => {
			const editor = new GoogleDocstringEditor();
			const docstring = `"""Function.

Args:
    data_value (int): Parameter with underscore
"""`;

			editor.load(docstring);

			// Should find parameter with underscore in name
			editor.updateParameterType('data_value', 'str');
			const result = editor.getText();

			assert.ok(result.includes('data_value (str)'));
		});
	});

	suite('Exception Type Matching', () => {
		test('Should not match exception type as substring', () => {
			const editor = new GoogleDocstringEditor();
			const docstring = `"""Function.

Raises:
        ValueErrorExtended: Extended error
"""`;

			editor.load(docstring);

			// Try to remove 'ValueError' - should NOT remove 'ValueErrorExtended'
			editor.removeException('ValueError');
			const result = editor.getText();

			// 'ValueErrorExtended' should still be there
			assert.ok(result.includes('ValueErrorExtended: Extended error'));
		});
	});

	suite('Empty Lines and Whitespace', () => {
		test('Should handle docstring with multiple empty lines', () => {
			const editor = new GoogleDocstringEditor();
			const docstring = `"""Function.


Args:


    x (int): Parameter


"""`;

			editor.load(docstring);
			editor.removeParameter('x');
			const result = editor.getText();

			// Should not crash and should remove parameter
			assert.ok(!result.includes('x (int)'));
		});
	});

	suite('Section Ordering', () => {
		test('Should add Args before Returns when Returns exists', () => {
			const editor = new GoogleDocstringEditor();
			const docstring = `"""Function.

Returns:
    int: Result
"""`;

			editor.load(docstring);
			editor.addParameter({
				name: 'x',
				type: 'int',
				defaultValue: null,
				isOptional: false,
			});
			const result = editor.getText();

			// Args should come before Returns
			const argsIndex = result.indexOf('Args:');
			const returnsIndex = result.indexOf('Returns:');

			assert.ok(argsIndex !== -1, 'Args section should exist');
			assert.ok(returnsIndex !== -1, 'Returns section should exist');
			assert.ok(argsIndex < returnsIndex, 'Args should come before Returns');
		});

		test('Should add Raises after Returns when Returns exists', () => {
			const editor = new GoogleDocstringEditor();
			const docstring = `"""Function.

Args:
    x (int): Parameter

Returns:
    int: Result
"""`;

			editor.load(docstring);
			editor.addException('ValueError', 'If invalid');
			const result = editor.getText();

			// Raises should come after Returns
			const returnsIndex = result.indexOf('Returns:');
			const raisesIndex = result.indexOf('Raises:');

			assert.ok(returnsIndex !== -1, 'Returns section should exist');
			assert.ok(raisesIndex !== -1, 'Raises section should exist');
			assert.ok(raisesIndex > returnsIndex, 'Raises should come after Returns');
		});
	});
});
