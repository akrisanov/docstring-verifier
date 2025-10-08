import * as assert from 'assert';
import { GoogleDocstringParser } from '../../../docstring/python/googleParser';

suite('GoogleDocstringParser Test Suite', () => {
	let parser: GoogleDocstringParser;

	setup(() => {
		parser = new GoogleDocstringParser();
	});

	test('Parse empty docstring', () => {
		const result = parser.parse('');

		assert.strictEqual(result.parameters.length, 0);
		assert.strictEqual(result.returns, null);
		assert.strictEqual(result.raises.length, 0);
		assert.strictEqual(result.notes, null);
	});

	test('Parse docstring with parameters', () => {
		const docstring = `
Add two numbers.

Args:
    x (int): First number
    y (int): Second number
`;

		const result = parser.parse(docstring);

		assert.strictEqual(result.parameters.length, 2);
		assert.strictEqual(result.parameters[0].name, 'x');
		assert.strictEqual(result.parameters[0].type, 'int');
		assert.strictEqual(result.parameters[0].description, 'First number');
		assert.strictEqual(result.parameters[1].name, 'y');
		assert.strictEqual(result.parameters[1].type, 'int');
		assert.strictEqual(result.parameters[1].description, 'Second number');
	});

	test('Parse docstring with parameters without types', () => {
		const docstring = `
Do something.

Args:
    name: The name to use
    value: The value to set
`;

		const result = parser.parse(docstring);

		assert.strictEqual(result.parameters.length, 2);
		assert.strictEqual(result.parameters[0].name, 'name');
		assert.strictEqual(result.parameters[0].type, null);
		assert.strictEqual(result.parameters[0].description, 'The name to use');
		assert.strictEqual(result.parameters[1].name, 'value');
		assert.strictEqual(result.parameters[1].type, null);
		assert.strictEqual(result.parameters[1].description, 'The value to set');
	});

	test('Parse docstring with multi-line parameter description', () => {
		const docstring = `
Complex function.

Args:
    data (dict): A dictionary containing the data.
        It should have the following structure:
        - 'name': str
        - 'value': int
`;

		const result = parser.parse(docstring);

		assert.strictEqual(result.parameters.length, 1);
		assert.strictEqual(result.parameters[0].name, 'data');
		assert.strictEqual(result.parameters[0].type, 'dict');
		assert.ok(result.parameters[0].description.includes('dictionary containing the data'));
		assert.ok(result.parameters[0].description.includes('name'));
		assert.ok(result.parameters[0].description.includes('value'));
	});

	test('Parse docstring with return value', () => {
		const docstring = `
Calculate something.

Returns:
    int: The calculated result
`;

		const result = parser.parse(docstring);

		assert.notStrictEqual(result.returns, null);
		assert.strictEqual(result.returns?.type, 'int');
		assert.strictEqual(result.returns?.description, 'The calculated result');
	});

	test('Parse docstring with return value without type', () => {
		const docstring = `
Get value.

Returns:
    The value from the database
`;

		const result = parser.parse(docstring);

		assert.notStrictEqual(result.returns, null);
		assert.strictEqual(result.returns?.type, null);
		assert.strictEqual(result.returns?.description, 'The value from the database');
	});

	test('Parse docstring with exceptions', () => {
		const docstring = `
Open file.

Raises:
    FileNotFoundError: If the file does not exist
    PermissionError: If access is denied
`;

		const result = parser.parse(docstring);

		assert.strictEqual(result.raises.length, 2);
		assert.strictEqual(result.raises[0].type, 'FileNotFoundError');
		assert.strictEqual(result.raises[0].description, 'If the file does not exist');
		assert.strictEqual(result.raises[1].type, 'PermissionError');
		assert.strictEqual(result.raises[1].description, 'If access is denied');
	});

	test('Parse complete docstring with all sections', () => {
		const docstring = `
Perform complex operation.

This function does something complex with the data.

Args:
    x (int): First parameter
    y (str): Second parameter

Returns:
    bool: True if successful, False otherwise

Raises:
    ValueError: If x is negative
    TypeError: If y is not a string

Note:
    This is an important note about the function.
`;

		const result = parser.parse(docstring);

		assert.strictEqual(result.parameters.length, 2);
		assert.strictEqual(result.parameters[0].name, 'x');
		assert.strictEqual(result.parameters[1].name, 'y');

		assert.notStrictEqual(result.returns, null);
		assert.strictEqual(result.returns?.type, 'bool');

		assert.strictEqual(result.raises.length, 2);
		assert.strictEqual(result.raises[0].type, 'ValueError');
		assert.strictEqual(result.raises[1].type, 'TypeError');

		assert.notStrictEqual(result.notes, null);
		assert.ok(result.notes?.includes('important note'));
	});

	test('Parse docstring with alternative section names', () => {
		const docstring = `
Test function.

Arguments:
    a (int): First
    b (int): Second

Return:
    int: Sum

Throws:
    Exception: On error
`;

		const result = parser.parse(docstring);

		assert.strictEqual(result.parameters.length, 2);
		assert.notStrictEqual(result.returns, null);
		assert.strictEqual(result.raises.length, 1);
	});

	test('Parse real example from missing_parameter.py', () => {
		const docstring = `Add two numbers.

Args:
    y (int): Second number
    # Missing: x parameter is not documented!

Returns:
    int: Sum of the numbers`;

		const result = parser.parse(docstring);

		// Should only parse 'y', ignore the comment line
		assert.strictEqual(result.parameters.length, 1);
		assert.strictEqual(result.parameters[0].name, 'y');
		assert.strictEqual(result.parameters[0].type, 'int');

		assert.notStrictEqual(result.returns, null);
		assert.strictEqual(result.returns?.type, 'int');
	});

	test('Parse return with description containing colon', () => {
		const docstring = `Get data.

Returns:
    A dictionary with the following keys: name, value, timestamp`;

		const result = parser.parse(docstring);

		assert.notStrictEqual(result.returns, null);
		assert.strictEqual(result.returns?.type, null);
		assert.ok(result.returns?.description.includes('dictionary'));
		assert.ok(result.returns?.description.includes('keys: name, value'));
	});

	test('Parse return with type and multi-line description', () => {
		const docstring = `Process data.

Returns:
    dict: A dictionary containing:
        - name: str
        - value: int`;

		const result = parser.parse(docstring);

		assert.notStrictEqual(result.returns, null);
		assert.strictEqual(result.returns?.type, 'dict');
		assert.ok(result.returns?.description.includes('dictionary containing'));
		assert.ok(result.returns?.description.includes('name: str'));
	});
});

