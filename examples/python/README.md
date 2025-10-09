# Example Python Files for Manual Testing

This folder contains example Python files that demonstrate different types of
docstring mismatches detected by the extension.

## Files

### Signature Analyzer (DSV1xx)

- **dsv101_missing_in_code.py** - DSV101: Parameter documented in docstring but not present in function signature
- **dsv102_missing_in_docstring.py** - DSV102: Parameter in code but missing in docstring
- **dsv103_type_mismatch.py** - DSV103: Parameter type in code doesn't match type in docstring
- **dsv104_optional_mismatch.py** - DSV104: Parameter optional/required status mismatch between code and docstring

### Return Analyzer (DSV2xx)

- **dsv201_return_mismatch.py** - DSV201: Return type mismatch between code and docstring
- **dsv202_missing_return.py** - DSV202: Function has return type but no Returns section in docstring
- **dsv203_void_but_documented.py** - DSV203: Function is void (no return) but docstring documents a return
- **dsv204_multiple_returns.py** - DSV204: Function has multiple inconsistent return types
- **dsv205_generator_returns.py** - DSV205: Generator function uses Returns instead of Yields

### Exception Analyzer (DSV3xx)

- **dsv301_missing_exception.py** - DSV301: Exception raised but not documented in docstring
- **dsv302_exception_not_raised.py** - DSV302: Exception documented but not raised in code

### Side Effects Analyzer (DSV4xx)

- **dsv401_side_effects.py** - DSV401: Side effects (I/O, print, global modifications) not documented

## Usage

1. Press **F5** to launch Extension Development Host
2. Open any file from this folder (e.g., `dsv101_missing_in_code.py`)
3. Observe warnings/errors in the **Problems** panel (Cmd+Shift+M)
4. Hover over yellow/red squiggly lines to see diagnostic messages

## File Naming Convention

Files follow the pattern: `dsv{code}_{description}.py`

- `dsv` prefix indicates "Docstring Verifier"
- `{code}` is the diagnostic code (101, 102, 201, 301, etc.)
- `{description}` briefly describes the issue

## Notes

- These files are for **manual testing** during development
- Each file contains both **incorrect** examples (that should trigger warnings) and **correct** examples (that should not)
- Unit test fixtures are located in `src/test/fixtures/python/`
- Python AST extractor fixtures are in `tools/python/tests/fixtures/`
