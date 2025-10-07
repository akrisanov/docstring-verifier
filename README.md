# Docstring Verifier

## Project Goal

Build a VS Code extension that detects discrepancies between docstrings and actual code implementations, highlighting errors and suggesting corrections.

## Success Criteria for CodeSpeak

- Opens Python file → plugin highlights parameter mismatch
- Diagnostics + Quick Fix → auto-generates correct docstring
- Multi-language support (Python + TypeScript) showing architecture extensibility

The implementation plan can be found in [MVP.md](./MVP.md).

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

For detailed architecture, see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

(C) MIT, Andrey Krisanov 2025
