# Example Python Files for Manual Testing

This folder contains example Python files that demonstrate different types of
docstring mismatches detected by the extension.

## Files

- **missing_parameter.py** - DSV102: Parameter in code but missing in docstring
- **return_mismatch.py** - DSV201: Return type mismatch between code and docstring
- **missing_exception.py** - DSV301: Exception raised but not documented

## Usage

1. Press F5 to launch Extension Development Host
2. Open any file from this folder
3. Observe warnings/errors in the Problems panel
4. Hover over yellow/red squiggly lines to see diagnostic messages

## Notes

These files are for **manual testing** during development.
Unit test fixtures are located in `src/test/fixtures/python/`.
