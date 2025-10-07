# Python AST Extractor

A Python script that extracts function metadata from Python source files using the `ast` module.

## Purpose

This tool is used by the Docstring Verifier VS Code extension to analyze Python files. It outputs JSON data about functions, including:

- Function signatures (parameters, types, defaults)
- Return type annotations
- Return statements
- Raised exceptions
- Docstrings and their locations
- Side effects (I/O operations, global modifications)

## Usage

```bash
python3 ast_extractor.py <file_path>
```

## Output Format

The output JSON is fully compatible with TypeScript interfaces using camelCase field names and VS Code Range format:

```json
{
  "success": true,
  "file": "path/to/file.py",
  "functions": [
    {
      "name": "function_name",
      "range": {
        "start": {"line": 9, "character": 0},
        "end": {"line": 19, "character": 15}
      },
      "parameters": [
        {
          "name": "param1",
          "type": "str",
          "defaultValue": null,
          "isOptional": false
        }
      ],
      "returnType": "int",
      "returnStatements": [
        {
          "type": "int",
          "line": 15
        }
      ],
      "raises": [
        {
          "type": "ValueError",
          "line": 12
        }
      ],
      "docstring": "Function docstring...",
      "docstringRange": {
        "start": {"line": 10, "character": 0},
        "end": {"line": 12, "character": 0}
      },
      "hasIO": false,
      "hasGlobalMods": false
    }
  ]
}
```

**Note:** VS Code uses 0-based line indexing, so Python line numbers (1-based) are converted automatically.

## Error Handling

If the file has syntax errors or doesn't exist:

```json
{
  "success": false,
  "error": "SyntaxError",
  "message": "invalid syntax",
  "line": 5,
  "offset": 10
}
```

## Features

### Parameter Extraction

- Regular parameters with type hints
- Default values
- `*args` and `**kwargs`
- Keyword-only arguments
- Filters out `self` and `cls`

### Return Analysis

- Return type annotations
- Actual return statements in function body
- Basic type inference for constants

### Exception Tracking

- `raise` statements
- Exception types (built-in and custom)

### Side Effect Detection

- I/O operations: `open()`, `read()`, `write()`, `print()`, `input()`
- File method calls: `.read()`, `.write()`, etc.
- Global/nonlocal variable modifications

### Docstring Extraction

- Full docstring text
- Line numbers for precise location
- Works with all docstring formats (Google, Sphinx, NumPy)

## Testing

Run unit tests:

```bash
cd tools/python

# Using uv (recommended)
uv run pytest

# Or with coverage
uv run pytest --cov
```

Test the CLI manually:

```bash
# Test on fixture file
python3 ast_extractor.py tests/fixtures/test_sample.py

# Test on examples
python3 ast_extractor.py ../../examples/python/missing_parameter.py
python3 ast_extractor.py ../../examples/python/return_mismatch.py
python3 ast_extractor.py ../../examples/python/missing_exception.py
```

From project root:

```bash
# Via npm scripts
pnpm run test:python
```

## Requirements

- Python 3.9+
- No external dependencies (uses only stdlib)

## Development

For development workflow, dependency management, and tooling setup, see **[DEVELOPMENT.md](DEVELOPMENT.md)**.

Quick start:

```bash
cd tools/python
uv sync --all-groups  # Install dev dependencies
uv run pytest         # Run tests
```

## Integration

The TypeScript extension spawns this script as a subprocess:

```typescript
const result = await exec(`python3 ast_extractor.py ${filePath}`);
const data = JSON.parse(result.stdout);
```

## Limitations

- Only extracts top-level and nested function definitions
- Basic type inference (doesn't use type checkers)
- Exception tracking only covers explicit `raise` statements
- Side effect detection is heuristic-based

---

(C) MIT, Andrey Krisanov 2025
