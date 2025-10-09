import * as assert from 'assert';
import { detectDocstringStyle, detectFileDocstringStyle } from '../../../../docstring/python/styleDetector';

suite('DocstringStyleDetector Tests', () => {
	suite('Google-style detection', () => {
		test('Should detect Google-style with Args section', () => {
			const docstring = `
Calculate sum of two numbers.

Args:
    x (int): First number
    y (int): Second number

Returns:
    int: Sum of the numbers
`;
			assert.strictEqual(detectDocstringStyle(docstring), 'google');
		});

		test('Should detect Google-style with Arguments section', () => {
			const docstring = `
Process data.

Arguments:
    data (str): Input data

Returns:
    str: Processed data
`;
			assert.strictEqual(detectDocstringStyle(docstring), 'google');
		});

		test('Should detect Google-style with Raises section', () => {
			const docstring = `
Divide numbers.

Raises:
    ZeroDivisionError: If denominator is zero
`;
			assert.strictEqual(detectDocstringStyle(docstring), 'google');
		});

		test('Should detect Google-style with multiple sections', () => {
			const docstring = `
Complex function.

Args:
    x (int): Parameter

Returns:
    int: Result

Raises:
    ValueError: If invalid

Note:
    This is a note
`;
			assert.strictEqual(detectDocstringStyle(docstring), 'google');
		});
	});

	suite('Sphinx-style detection', () => {
		test('Should detect Sphinx-style with :param:', () => {
			const docstring = `
Calculate sum of two numbers.

:param x: First number
:type x: int
:param y: Second number
:type y: int
:returns: Sum of the numbers
:rtype: int
`;
			assert.strictEqual(detectDocstringStyle(docstring), 'sphinx');
		});

		test('Should detect Sphinx-style with :raises:', () => {
			const docstring = `
Divide numbers.

:param a: Numerator
:param b: Denominator
:raises ZeroDivisionError: If b is zero
:returns: Division result
`;
			assert.strictEqual(detectDocstringStyle(docstring), 'sphinx');
		});

		test('Should detect Sphinx-style with multiple directives', () => {
			const docstring = `
Complex function.

:param x: Parameter
:type x: int
:returns: Result
:rtype: int
:raises ValueError: If invalid
`;
			assert.strictEqual(detectDocstringStyle(docstring), 'sphinx');
		});
	});

	suite('Edge cases', () => {
		test('Should return unknown for empty docstring', () => {
			assert.strictEqual(detectDocstringStyle(''), 'unknown');
		});

		test('Should return unknown for plain text docstring', () => {
			const docstring = 'This is just a simple description.';
			assert.strictEqual(detectDocstringStyle(docstring), 'unknown');
		});

		test('Should return unknown for docstring with no style markers', () => {
			const docstring = `
This function does something.
It has multiple lines.
But no specific style markers.
`;
			assert.strictEqual(detectDocstringStyle(docstring), 'unknown');
		});

		test('Should handle whitespace-only docstring', () => {
			const docstring = '   \n\t\n   ';
			assert.strictEqual(detectDocstringStyle(docstring), 'unknown');
		});

		test('Should prefer Google when both patterns present with equal scores', () => {
			// This has 1 Google indicator and 1 Sphinx indicator
			const docstring = `
Args:
    x (int): Number

:param y: Text
`;
			// Should default to Google when scores are equal
			assert.strictEqual(detectDocstringStyle(docstring), 'google');
		});

		test('Should detect based on structure when scores equal but only one has structure', () => {
			// Equal scores but Google has proper structure
			const docstring = `
Args:
    x (int): First number

:returns: Result
`;
			// Google has indented structure, Sphinx doesn't
			assert.strictEqual(detectDocstringStyle(docstring), 'google');
		});
	}); suite('File-level style detection', () => {
		test('Should detect predominant Google style', () => {
			const docstrings = [
				'Args:\n    x (int): Number',
				'Returns:\n    int: Result',
				'Args:\n    y (str): Text',
			];
			assert.strictEqual(detectFileDocstringStyle(docstrings), 'google');
		});

		test('Should detect predominant Sphinx style', () => {
			const docstrings = [
				':param x: Number\n:type x: int',
				':returns: Result\n:rtype: int',
				':param y: Text',
			];
			assert.strictEqual(detectFileDocstringStyle(docstrings), 'sphinx');
		});

		test('Should default to Google for mixed styles with equal count', () => {
			const docstrings = [
				'Args:\n    x (int): Number',
				':param y: Text',
			];
			// When counts are equal, should default to Google
			assert.strictEqual(detectFileDocstringStyle(docstrings), 'google');
		}); test('Should default to Google for empty array', () => {
			assert.strictEqual(detectFileDocstringStyle([]), 'google');
		});

		test('Should default to Google when all docstrings are unknown', () => {
			const docstrings = [
				'Just a description',
				'Another plain text',
				'No style markers',
			];
			assert.strictEqual(detectFileDocstringStyle(docstrings), 'google');
		});

		test('Should ignore unknown styles and pick from known ones', () => {
			const docstrings = [
				'Plain text',
				'Args:\n    x (int): Number',
				'More plain text',
				'Returns:\n    int: Result',
			];
			assert.strictEqual(detectFileDocstringStyle(docstrings), 'google');
		});
	});
});
