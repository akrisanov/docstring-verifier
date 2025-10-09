import * as assert from 'assert';
import { GoogleDocstringParser } from '../../../../docstring/python/googleParser';

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

	test('Parse parameter with "optional" keyword', () => {
		const docstring = `
Function with optional parameter.

Args:
    name (str): Required name
    age (int, optional): Optional age parameter
`;

		const result = parser.parse(docstring);

		assert.strictEqual(result.parameters.length, 2);
		assert.strictEqual(result.parameters[0].name, 'name');
		assert.strictEqual(result.parameters[0].type, 'str');
		assert.strictEqual(result.parameters[0].isOptional, undefined);  // Not specified

		assert.strictEqual(result.parameters[1].name, 'age');
		assert.strictEqual(result.parameters[1].type, 'int');
		assert.strictEqual(result.parameters[1].isOptional, true);
	});

	test('Parse parameter with "optional" before type', () => {
		const docstring = `
Function with optional parameter (different format).

Args:
    name (str): Required name
    age (optional, int): Optional age parameter
`;

		const result = parser.parse(docstring);

		assert.strictEqual(result.parameters.length, 2);
		assert.strictEqual(result.parameters[1].name, 'age');
		assert.strictEqual(result.parameters[1].type, 'int');
		assert.strictEqual(result.parameters[1].isOptional, true);
	});

	test('Parse parameter with only "optional" keyword', () => {
		const docstring = `
Function with optional parameter (no type specified).

Args:
    name (str): Required name
    age (optional): Optional age parameter
`;

		const result = parser.parse(docstring);

		assert.strictEqual(result.parameters.length, 2);
		assert.strictEqual(result.parameters[1].name, 'age');
		// Note: "optional" alone without comma is treated as the type, not a keyword
		// This is expected behavior - user should write "(optional,)" or just omit parens
		assert.strictEqual(result.parameters[1].type, 'optional');
		assert.strictEqual(result.parameters[1].isOptional, undefined);
	});

	test('Parse multiple optional parameters', () => {
		const docstring = `
Function with multiple optional parameters.

Args:
    a (str): Required
    b (int, optional): Optional int
    c (float): Required
    d (bool, optional): Optional bool
`;

		const result = parser.parse(docstring);

		assert.strictEqual(result.parameters.length, 4);
		assert.strictEqual(result.parameters[0].isOptional, undefined);  // Not specified
		assert.strictEqual(result.parameters[1].isOptional, true);
		assert.strictEqual(result.parameters[2].isOptional, undefined);  // Not specified
		assert.strictEqual(result.parameters[3].isOptional, true);
	});

	test('Parse parameter without optional keyword defaults to undefined', () => {
		const docstring = `
Function with parameters.

Args:
    name (str): Name parameter
    age (int): Age parameter
`;

		const result = parser.parse(docstring);

		assert.strictEqual(result.parameters.length, 2);
		assert.strictEqual(result.parameters[0].isOptional, undefined);
		assert.strictEqual(result.parameters[1].isOptional, undefined);
	});

	test('Parse parameter with Optional type (not keyword)', () => {
		const docstring = `
Function with Optional type annotation.

Args:
    name (str): Name parameter
    age (Optional[int]): Age parameter with Optional type
`;

		const result = parser.parse(docstring);

		assert.strictEqual(result.parameters.length, 2);
		assert.strictEqual(result.parameters[0].name, 'name');
		assert.strictEqual(result.parameters[0].type, 'str');
		assert.strictEqual(result.parameters[0].isOptional, undefined);

		// "Optional[int]" should be kept as type, not treated as "optional" keyword
		assert.strictEqual(result.parameters[1].name, 'age');
		assert.strictEqual(result.parameters[1].type, 'Optional[int]');
		assert.strictEqual(result.parameters[1].isOptional, undefined);
	});

	test('Parse parameter with case-insensitive "optional" keyword', () => {
		const docstring = `
Test function.

Args:
	param1 (int, OPTIONAL): First parameter
	param2 (Optional, str): Second parameter
	param3 (INT, optional): Third parameter
`;

		const result = parser.parse(docstring);

		assert.strictEqual(result.parameters.length, 3);

		// "OPTIONAL" in uppercase should still be recognized
		assert.strictEqual(result.parameters[0].name, 'param1');
		assert.strictEqual(result.parameters[0].type, 'int');
		assert.strictEqual(result.parameters[0].isOptional, true);

		// "Optional" with capital should be recognized as keyword (with comma)
		assert.strictEqual(result.parameters[1].name, 'param2');
		assert.strictEqual(result.parameters[1].type, 'str');
		assert.strictEqual(result.parameters[1].isOptional, true);

		// Mixed case type and lowercase "optional"
		assert.strictEqual(result.parameters[2].name, 'param3');
		assert.strictEqual(result.parameters[2].type, 'INT');
		assert.strictEqual(result.parameters[2].isOptional, true);
	});

	test('Parse parameter with various spacing around "optional"', () => {
		const docstring = `
Test function.

Args:
	param1 (int,optional): No space before comma
	param2 (int, optional): Normal spacing
	param3 ( str , optional ): Extra spaces everywhere
	param4 (optional,int): No space after comma
`;

		const result = parser.parse(docstring);

		assert.strictEqual(result.parameters.length, 4);

		// No space before comma
		assert.strictEqual(result.parameters[0].name, 'param1');
		assert.strictEqual(result.parameters[0].type, 'int');
		assert.strictEqual(result.parameters[0].isOptional, true);

		// Normal spacing
		assert.strictEqual(result.parameters[1].name, 'param2');
		assert.strictEqual(result.parameters[1].type, 'int');
		assert.strictEqual(result.parameters[1].isOptional, true);

		// Extra spaces
		assert.strictEqual(result.parameters[2].name, 'param3');
		assert.strictEqual(result.parameters[2].type, 'str');
		assert.strictEqual(result.parameters[2].isOptional, true);

		// optional before type, no space
		assert.strictEqual(result.parameters[3].name, 'param4');
		assert.strictEqual(result.parameters[3].type, 'int');
		assert.strictEqual(result.parameters[3].isOptional, true);
	});
});
