import * as assert from 'assert';
import { SphinxDocstringParser } from '../../../../docstring/python/sphinxParser';

suite('SphinxDocstringParser Test Suite', () => {
	let parser: SphinxDocstringParser;

	setup(() => {
		parser = new SphinxDocstringParser();
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

:param x: First number
:type x: int
:param y: Second number
:type y: int
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

:param name: The name to use
:param value: The value to set
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

:param data: A dictionary containing the data.
    It should have the following structure:
    - 'name': str
    - 'value': int
:type data: dict
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

:returns: The calculated result
:rtype: int
`;

		const result = parser.parse(docstring);

		assert.notStrictEqual(result.returns, null);
		assert.strictEqual(result.returns?.type, 'int');
		assert.strictEqual(result.returns?.description, 'The calculated result');
	});

	test('Parse docstring with return value without type', () => {
		const docstring = `
Get value.

:returns: The value from the database
`;

		const result = parser.parse(docstring);

		assert.notStrictEqual(result.returns, null);
		assert.strictEqual(result.returns?.type, null);
		assert.strictEqual(result.returns?.description, 'The value from the database');
	});

	test('Parse docstring with return type but no description', () => {
		const docstring = `
Get value.

:rtype: str
`;

		const result = parser.parse(docstring);

		assert.notStrictEqual(result.returns, null);
		assert.strictEqual(result.returns?.type, 'str');
		assert.strictEqual(result.returns?.description, '');
	});

	test('Parse docstring with exceptions', () => {
		const docstring = `
Open file.

:raises FileNotFoundError: If the file does not exist
:raises PermissionError: If access is denied
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

:param x: First parameter
:type x: int
:param y: Second parameter
:type y: str
:returns: True if successful, False otherwise
:rtype: bool
:raises ValueError: If x is negative
:raises TypeError: If y is not a string
:note: This is an important note about the function.
`;

		const result = parser.parse(docstring);

		assert.strictEqual(result.parameters.length, 2);
		assert.strictEqual(result.parameters[0].name, 'x');
		assert.strictEqual(result.parameters[0].type, 'int');
		assert.strictEqual(result.parameters[1].name, 'y');
		assert.strictEqual(result.parameters[1].type, 'str');

		assert.notStrictEqual(result.returns, null);
		assert.strictEqual(result.returns?.type, 'bool');

		assert.strictEqual(result.raises.length, 2);
		assert.strictEqual(result.raises[0].type, 'ValueError');
		assert.strictEqual(result.raises[1].type, 'TypeError');

		assert.notStrictEqual(result.notes, null);
		assert.ok(result.notes?.includes('important note'));
	});

	test('Parse docstring with alternative directive names', () => {
		const docstring = `
Test function.

:parameter a: First
:parameter b: Second
:return: Sum
:raise Exception: On error
`;

		const result = parser.parse(docstring);

		assert.strictEqual(result.parameters.length, 2);
		assert.strictEqual(result.parameters[0].name, 'a');
		assert.strictEqual(result.parameters[1].name, 'b');
		assert.notStrictEqual(result.returns, null);
		assert.strictEqual(result.raises.length, 1);
	});

	test('Parse parameter with optional type', () => {
		const docstring = `
Function with optional parameter.

:param name: Required name
:type name: str
:param age: Optional age parameter
:type age: int, optional
`;

		const result = parser.parse(docstring);

		assert.strictEqual(result.parameters.length, 2);
		assert.strictEqual(result.parameters[0].name, 'name');
		assert.strictEqual(result.parameters[0].type, 'str');
		assert.strictEqual(result.parameters[0].isOptional, undefined);

		assert.strictEqual(result.parameters[1].name, 'age');
		assert.strictEqual(result.parameters[1].type, 'int');
		assert.strictEqual(result.parameters[1].isOptional, true);
	});

	test('Parse parameter with "or None" type', () => {
		const docstring = `
Function with nullable parameter.

:param name: The name
:type name: str or None
`;

		const result = parser.parse(docstring);

		assert.strictEqual(result.parameters.length, 1);
		assert.strictEqual(result.parameters[0].name, 'name');
		assert.strictEqual(result.parameters[0].type, 'str or None');
	});

	test('Parse parameter with optional before type', () => {
		const docstring = `
Function with optional parameter.

:param age: Age parameter
:type age: optional int
`;

		const result = parser.parse(docstring);

		assert.strictEqual(result.parameters.length, 1);
		assert.strictEqual(result.parameters[0].name, 'age');
		assert.strictEqual(result.parameters[0].type, 'int');
		assert.strictEqual(result.parameters[0].isOptional, true);
	});

	test('Parse multiple optional parameters', () => {
		const docstring = `
Function with multiple optional parameters.

:param a: Required
:type a: str
:param b: Optional int
:type b: int, optional
:param c: Required
:type c: float
:param d: Optional bool
:type d: optional bool
`;

		const result = parser.parse(docstring);

		assert.strictEqual(result.parameters.length, 4);
		assert.strictEqual(result.parameters[0].isOptional, undefined);
		assert.strictEqual(result.parameters[1].isOptional, true);
		assert.strictEqual(result.parameters[2].isOptional, undefined);
		assert.strictEqual(result.parameters[3].isOptional, true);
	});

	test('Parse type without corresponding param', () => {
		const docstring = `
Function with only type directive.

:type x: int
`;

		const result = parser.parse(docstring);

		assert.strictEqual(result.parameters.length, 1);
		assert.strictEqual(result.parameters[0].name, 'x');
		assert.strictEqual(result.parameters[0].type, 'int');
		assert.strictEqual(result.parameters[0].description, '');
	});

	test('Parse param without corresponding type', () => {
		const docstring = `
Function with only param directive.

:param x: The x value
`;

		const result = parser.parse(docstring);

		assert.strictEqual(result.parameters.length, 1);
		assert.strictEqual(result.parameters[0].name, 'x');
		assert.strictEqual(result.parameters[0].type, null);
		assert.strictEqual(result.parameters[0].description, 'The x value');
	});

	test('Parse mixed order of param and type directives', () => {
		const docstring = `
Mixed order test.

:type x: int
:param x: X value
:param y: Y value
:type y: str
`;

		const result = parser.parse(docstring);

		assert.strictEqual(result.parameters.length, 2);
		assert.strictEqual(result.parameters[0].name, 'x');
		assert.strictEqual(result.parameters[0].type, 'int');
		assert.strictEqual(result.parameters[0].description, 'X value');
		assert.strictEqual(result.parameters[1].name, 'y');
		assert.strictEqual(result.parameters[1].type, 'str');
		assert.strictEqual(result.parameters[1].description, 'Y value');
	});

	test('Parse return with multi-line description', () => {
		const docstring = `
Process data.

:returns: A dictionary containing:
    - name: str
    - value: int
:rtype: dict
`;

		const result = parser.parse(docstring);

		assert.notStrictEqual(result.returns, null);
		assert.strictEqual(result.returns?.type, 'dict');
		assert.ok(result.returns?.description.includes('dictionary containing'));
		assert.ok(result.returns?.description.includes('name: str'));
	});

	test('Parse exceptions with multi-line descriptions', () => {
		const docstring = `
Open file.

:raises FileNotFoundError: If the file does not exist
    or cannot be accessed
:raises PermissionError: If access is denied
    due to insufficient privileges
`;

		const result = parser.parse(docstring);

		assert.strictEqual(result.raises.length, 2);
		assert.ok(result.raises[0].description.includes('cannot be accessed'));
		assert.ok(result.raises[1].description.includes('insufficient privileges'));
	});

	test('Parse multiple notes', () => {
		const docstring = `
Function with notes.

:note: First note
:note: Second note
`;

		const result = parser.parse(docstring);

		assert.notStrictEqual(result.notes, null);
		assert.ok(result.notes?.includes('First note'));
		assert.ok(result.notes?.includes('Second note'));
	});

	test('Parse with case-insensitive optional keyword', () => {
		const docstring = `
Test function.

:param param1: First parameter
:type param1: int, OPTIONAL
:param param2: Second parameter
:type param2: Optional str
`;

		const result = parser.parse(docstring);

		assert.strictEqual(result.parameters.length, 2);
		assert.strictEqual(result.parameters[0].isOptional, true);
		assert.strictEqual(result.parameters[1].isOptional, true);
	});
});
