# Docstring Verifier

## Project Goal

Build a VS Code extension that detects discrepancies between docstrings and actual code implementations, highlighting errors and suggesting corrections.

## Success Criteria for CodeSpeak

- Opens Python file → plugin highlights parameter mismatch
- Diagnostics + Quick Fix → auto-generates correct docstring
- Multi-language support (Python + TypeScript) showing architecture extensibility

The implementation plan can be found in [MVP.md](./docs/MVP.md).

Sneak peek of the extension prototype (day 1) in action:

![Demo](./docs/day1.png)

## Limitations

- Python only supports Google and Sphinx docstring formats (not NumPy)
- Basic type checking (doesn't handle complex generics or custom types)
- Side effects detection is primitive (file I/O, print, globals only)
- TypeScript support doesn't cover all JSDoc tags
- No integration with type checkers (mypy, pyright)

## Architecture

Simple high-level flow:

```text
┌──────────────┐
│  VS Code     │  User edits Python/TypeScript file
│  Editor      │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Language    │  Extract function signature + body
│  Parser      │  (Python AST / TS Compiler API)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Docstring   │  Parse Args/Returns/Raises
│  Parser      │  (Google/Sphinx/JSDoc)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Analyzers   │  Compare code facts vs docstring
│              │  → Find mismatches
└──────┬───────┘
       │
       ├─────────────────┐
       ▼                 ▼
┌──────────────┐  ┌──────────────┐
│ Diagnostics  │  │ Code Actions │
│ (Red lines)  │  │ (Quick Fix)  │
└──────────────┘  └──────────────┘
```

**Key Features:**

- **4 Validation Rules**: Parameters, Return types, Exceptions, Side effects
- **Multi-language**: Python (Google/Sphinx) + TypeScript (JSDoc)
- **Diagnostic Codes**: DSV101-401 for filtering
- **Quick Fixes**: Auto-generate corrected docstrings

For detailed architecture, see [Design.md](./docs/Design.md).

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

---

(C) MIT, Andrey Krisanov 2025
