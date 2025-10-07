# Development with uv

Quick start guide for developing the Python AST extractor.

## Initial Setup

```bash
# 1. Install uv (if not installed)
curl -LsSf https://astral.sh/uv/install.sh | sh

# 2. Navigate to tools/python
cd tools/python

# 3. Sync dependencies (creates .venv automatically)
uv sync --all-groups
```

## Daily Workflow

```bash
# Run tests
uv run python -m pytest

# Run tests with coverage (Note: coverage shows 0% because tests use subprocess)
uv run python -m pytest --cov

# Lint code
uv run ruff check .

# Fix linting issues
uv run ruff check --fix .

# Format code
uv run ruff format .

# Run ast_extractor
uv run python ast_extractor.py tests/fixtures/test_sample.py
```

> **Note:** Coverage reports 0% because tests execute `ast_extractor.py` via subprocess.
> This is intentional as we're testing the CLI interface.

## From Project Root

```bash
# Via npm scripts (with uv fallback)
pnpm run test:python
pnpm run lint:python
pnpm run format:python
```

## VS Code Integration

Add to `.vscode/settings.json`:

```json
{
  "python.defaultInterpreterPath": "${workspaceFolder}/tools/python/.venv/bin/python",
  "[python]": {
    "editor.defaultFormatter": "charliermarsh.ruff",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.fixAll": "explicit",
      "source.organizeImports": "explicit"
    }
  }
}
```

## Dependency Management

```bash
# Add a development dependency
# Edit pyproject.toml [dependency-groups] and run:
uv sync --group dev

# Update all dependencies
uv sync --upgrade

# Lock dependencies
uv lock
```

## Python Version

The project uses Python 3.9+ (specified in `.python-version`).
uv will automatically use the correct Python version.
