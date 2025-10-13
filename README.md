# Docstring Verifier

[![CI](https://github.com/akrisanov/docstring-verifier/actions/workflows/ci.yml/badge.svg)](https://github.com/akrisanov/docstring-verifier/actions/workflows/ci.yml)
[![CodeQL](https://github.com/akrisanov/docstring-verifier/actions/workflows/codeql.yml/badge.svg)](https://github.com/akrisanov/docstring-verifier/actions/workflows/codeql.yml)
[![codecov](https://codecov.io/gh/akrisanov/docstring-verifier/branch/main/graph/badge.svg)](https://codecov.io/gh/akrisanov/docstring-verifier)

## Project Goal

Build a VS Code extension that detects discrepancies between docstrings and actual code implementations,
highlighting errors and suggesting corrections.

**Current Status:** Core functionality complete with 11 validation rules, automated Quick Fixes for parameters,
and AI-powered description generation.

## What's Implemented

**Core Features:**

- **11 Validation Rules** covering parameters, returns, exceptions, and side effects (DSV101-401)
- **Parameter Quick Fixes** with AI-generated descriptions via GitHub Copilot
- **Real-time Diagnostics** in VS Code Problems panel
- **Status Bar Integration** showing issue count
- **Google & Sphinx Docstring Parsing** with auto-detection
- **High Test Coverage** (86%) with comprehensive test suite

**Configuration:**

- Dynamic configuration without restart
- Customizable Python path and execution method (uv support)
- Adjustable LLM timeout and provider selection
- Configurable logging levels

## Known Limitations

- **Quick Fixes:** Only parameter fixes (DSV101-104) are automated; return/exception fixes require manual editing
- **Docstring Editors:** Google style editor fully implemented; Sphinx editor not available (parsing only)
- **Language Support:** Python only (architecture ready for TypeScript/JavaScript)
- **Type Checking:** Basic type normalization; no deep generic/custom type analysis
- **No Integration:** Does not integrate with mypy, pyright, or other type checkers

The implementation plan can be found in [MVP.md](./docs/MVP.md).

## Architecture

High-level flow showing core components:

```text
┌──────────────┐
│  VS Code     │  User edits Python file
│  Editor      │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Language    │  Extract function signature + body
│  Parser      │  (Python AST via subprocess)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Docstring   │  Parse Args/Returns/Raises
│  Parser      │  (Google/Sphinx auto-detection)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Analyzers   │  Compare code vs docstring
│              │  → Detect 11 types of issues
└──────┬───────┘
       │
       ├──────────────────────┐
       ▼                      ▼
┌──────────────┐      ┌──────────────────┐
│ Diagnostics  │      │  Code Actions    │
│              │      │  (Quick Fix)     │
│ • Problems   │      │                  │
│   panel      │      │ ┌──────────────┐ │
│ • Squiggles  │      │ │ LLM Service  │ │
│ • Status bar │      │ │ (AI gen)     │ │
│   counter    │      │ └──────┬───────┘ │
└──────────────┘      │        ▼         │
                      │ ┌──────────────┐ │
                      │ │  Docstring   │ │
                      │ │  Editor      │ │
                      │ │  (surgical)  │ │
                      │ └──────────────┘ │
                      └──────────────────┘
```

**Key Features:**

- **11 Validation Rules**: 4 parameter, 5 return, 2 exception, 1 side effects
- **Automated Parameter Fixes**: Quick Fixes for DSV101-104 with surgical docstring edits
- **AI-Powered Descriptions**: GitHub Copilot integration for smart parameter descriptions
- **Dual Docstring Support**: Google-style and Sphinx-style with auto-detection
- **Real-time Feedback**: VS Code diagnostics, status bar indicator, and Problems panel integration
- **Generator Support**: Detects yield statements and validates Yields vs Returns sections
- **Performance Optimized**: Caching, debouncing, and async processing for fast analysis
- **Extensible Architecture**: Multi-language ready (Python implemented, TypeScript architecture ready)

For detailed architecture, see [Design.md](./docs/Design.md).

## Configuration

The extension works out of the box with sensible defaults. All settings can be configured via:

- VS Code UI: **Preferences → Settings** → Search for "Docstring Verifier"
- VS Code JSON: **Preferences → Settings (JSON)** → Add `docstringVerifier.*` keys

### Quick Start

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm install
```

No configuration needed! The extension will:

- Auto-detect your Python interpreter
- Auto-detect docstring style (Google/Sphinx)
- Use AI (GitHub Copilot) for smart descriptions

### Common Settings

```jsonc
{
  // Enable/disable the extension (default: true)
  "docstringVerifier.enable": true,

  // Use AI for generating descriptions in Quick Fixes (default: true)
  // Requires GitHub Copilot extension
  "docstringVerifier.useLLM": true,

  // Docstring style: "auto" (detect), "google", or "sphinx" (default: "auto")
  "docstringVerifier.docstringStyle": "auto",

  // Logging level: "error", "warn", "info", "debug", "trace" (default: "info")
  "docstringVerifier.logLevel": "info"
}
```

### Advanced Settings

```jsonc
{
  // Custom Python interpreter (default: "" = auto-detect)
  "docstringVerifier.pythonPath": "/usr/local/bin/python3",

  // Prefer uv for faster Python execution (default: true)
  "docstringVerifier.preferUv": true,

  // LLM timeout in milliseconds, 1000-30000 (default: 5000)
  "docstringVerifier.llmTimeout": 5000,

  // LLM provider (default: "github-copilot")
  // Currently only GitHub Copilot is supported
  "docstringVerifier.llmProvider": "github-copilot"
}
```

### AI-Powered Descriptions

When **Quick Fixes** add missing parameters (DSV102), the extension can use AI to generate
smart descriptions instead of "TODO" placeholders.

**Requirements:**

- Install [GitHub Copilot](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot) extension
- Set `"docstringVerifier.useLLM": true` (enabled by default)

**How it works:**

1. Click Quick Fix → parameter is added instantly with "TODO: Add description"
2. AI generates description in the background (typically 1-3 seconds)
3. "TODO" is automatically replaced with the AI-generated text
4. Future requests for the same parameter reuse cached descriptions

**Note:** AI descriptions are currently available only for parameter Quick Fixes.
Return and exception documentation requires manual editing.

### Troubleshooting

**Extension not working?**

- Check Python is installed: `python --version` or `python3 --version`
- Try setting `pythonPath` explicitly in settings
- Set `"docstringVerifier.logLevel": "debug"` to see detailed logs in Output panel

**AI descriptions not working?**

- Verify GitHub Copilot is installed and activated
- Check `"docstringVerifier.useLLM": true` in settings
- Try increasing timeout: `"docstringVerifier.llmTimeout": 10000`

**Slow performance?**

- Enable `"docstringVerifier.preferUv": true` (requires [uv](https://github.com/astral-sh/uv))
- Reduce logging: `"docstringVerifier.logLevel": "warn"`

## Technical Stack

- **Language:** TypeScript
- **Framework:** VS Code Extension API
- **Python Parsing:** Python `ast` module (via child_process)
- **TypeScript Parsing:** TypeScript Compiler API
- **Testing:** Mocha + @vscode/test-electron
- **Build:** esbuild
- **Package Manager:** pnpm
- **CI/CD:** GitHub Actions
- **Linting:** ESLint + Prettier
- **Coverage:** Istanbul (lcov) → Codecov

## Development

### Running Tests

```bash
# Run tests without coverage
pnpm run test

# Run tests with coverage
pnpm run test:coverage

# Validate coverage report
pnpm run test:validate-coverage
```

### Coverage Reports

Coverage reports are automatically generated and uploaded to [Codecov](https://codecov.io/gh/akrisanov/docstring-verifier).

---

(C) MIT, Andrey Krisanov 2025
