# System Design

## Overview

Docstring Verifier is a VS Code extension that validates consistency between Python function
signatures and their docstrings. The extension performs real-time analysis and displays
diagnostics for detected mismatches.

**Current Capabilities:**

- ✅ Parameter validation (4 rules)
- ✅ Return type validation (5 rules)
- ✅ Generator and async function support
- ✅ Real-time diagnostics in VS Code Problems panel
- 🚧 Exception validation (in progress)
- 🚧 Code Actions / Quick Fixes (planned)

## High-Level Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                    VS Code Extension Host                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ Document Events
                           │ (onChange, onSave)
                           │
           ┌───────────────▼───────────────┐
           │      Extension Activator      │
           │       (extension.ts)          │
           │                               │
           │  • Register diagnostic        │
           │    collection                 │
           │  • Document listeners         │
           │  • Coordinate analysis        │
           └───────────────┬───────────────┘
                           │
                           │ Parse request
                           │
           ┌───────────────▼───────────────┐
           │        Parser Layer           │
           │                               │
           │  ┌─────────────────────────┐  │
           │  │   Language Parser       │  │
           │  │   (Python AST)          │  │
           │  │                         │  │
           │  │  • Extract function     │  │
           │  │    signatures           │  │
           │  │  • Parameters, returns  │  │
           │  │  • Yields, exceptions   │  │
           │  └─────────────────────────┘  │
           │                               │
           │  ┌─────────────────────────┐  │
           │  │  Docstring Parser       │  │
           │  │  (Google-style)         │  │
           │  │                         │  │
           │  │  • Args, Returns        │  │
           │  │  • Raises, Yields       │  │
           │  │  • Multi-line support   │  │
           │  └─────────────────────────┘  │
           └───────────────┬───────────────┘
                           │
                           │ Parsed data
                           │
           ┌───────────────▼───────────────┐
           │       Analyzer Layer          │
           │                               │
           │  ┌─────────────────────────┐  │
           │  │  Signature Analyzer     │  │
           │  │  • Parameter checks     │  │
           │  │  • Type normalization   │  │
           │  │  • Optional handling    │  │
           │  └─────────────────────────┘  │
           │                               │
           │  ┌─────────────────────────┐  │
           │  │   Return Analyzer       │  │
           │  │  • Return type checks   │  │
           │  │  • Generator detection  │  │
           │  │  • Multiple returns     │  │
           │  └─────────────────────────┘  │
           │                               │
           │  ┌─────────────────────────┐  │
           │  │  Exception Analyzer     │  │
           │  │  • Raised vs documented │  │
           │  │  • (in progress)        │  │
           │  └─────────────────────────┘  │
           └───────────────┬───────────────┘
                           │
                           │ Diagnostics
                           │
           ┌───────────────▼───────────────┐
           │    Diagnostic Factory         │
           │                               │
           │  • Create VS Code diagnostics │
           │  • Assign codes (DSV101-401)  │
           │  • Set severity levels        │
           │  • Format messages            │
           └───────────────┬───────────────┘
                           │
                           │ Display
                           │
           ┌───────────────▼───────────────┐
           │      VS Code UI               │
           │                               │
           │  • Yellow/red squiggly lines  │
           │  • Problems panel             │
           │  • Hover tooltips             │
           └───────────────────────────────┘
```

## Data Flow

```text
User edits file.py
       ↓
Extension detects change
       ↓
Python Parser extracts:
  - Function: calculate(x: int, y: int) -> int
  - Returns: [int]
  - Docstring exists
       ↓
Docstring Parser extracts:
  - Args: y (int)
  - Returns: str
       ↓
Signature Analyzer compares:
  ✓ Parameter 'y' matches
  ✗ Parameter 'x' missing in docstring → DSV102
       ↓
Return Analyzer compares:
  ✗ Return type int ≠ str → DSV201
       ↓
Diagnostic Factory creates:
  - Diagnostic 1: "Parameter 'x' missing..."
  - Diagnostic 2: "Return type mismatch..."
       ↓
VS Code displays:
  - Yellow squiggly lines on function
  - Warnings in Problems panel
```

## Type System

### Type Normalization

To improve user experience, the extension normalizes common type aliases:

| Code Type | Docstring Aliases       |
|-----------|-------------------------|
| `str`     | `string`, `str`, `STR`  |
| `int`     | `integer`, `int`, `INT` |
| `bool`    | `boolean`, `bool`       |
| `dict`    | `dictionary`, `dict`    |

### Optional Types

Handles multiple Optional syntaxes:

- `Optional[str]` ≡ `str | None` ≡ `Union[str, None]`
- Case-insensitive: `None`, `none`, `NONE`

### Complex Types

Preserves and compares complex types:

- Generics: `list[int]`, `dict[str, Any]`
- Unions: `str | int | None`
- No deep type checking (by design)

## Generator Support

Functions with `yield` or `yield from` statements are marked as generators:

- `isGenerator: true` flag set
- `yieldStatements[]` array populated

## Extension Points

### Adding New Analyzers

1. Implement `IAnalyzer` interface
2. Add diagnostic codes to `DiagnosticCode` enum
3. Register in `extension.ts` analysis pipeline
4. Create factory methods in `DiagnosticFactory`

### Adding New Docstring Formats

1. Implement `IDocstringParser` interface
2. Parse sections into `DocstringDescriptor`
3. Add format detection logic
4. Register parser in extension

### Adding New Languages

1. Implement `IParser` interface for language
2. Extract function metadata to `FunctionDescriptor`
3. Adapt analyzers or create language-specific ones
4. Update activation events in `package.json`

## Technical Decisions

### Why Subprocess for Python?

**Decision:** Use Python subprocess instead of pure JavaScript parser

**Rationale:**

- Python's `ast` module is stdlib and battle-tested
- Accurate type annotation extraction
- Easy exception tracking through AST
- No need to maintain custom Python parser

**Trade-off:** Startup latency (~50-100ms) vs parsing accuracy

### Why Type Normalization?

**Decision:** Normalize common type aliases before comparison

**Rationale:**

- Users mix `str`/`string` in docstrings
- Python typing evolved: `Optional[T]` vs `T | None`
- Better UX: fewer false positives

**Trade-off:** More complex comparison logic

### Why Information for DSV204?

**Decision:** Multiple return types as Information, not Warning

**Rationale:**

- Common pattern in Python (early returns, error handling)
- Not always incorrect (may need union type documentation)
- Helpful hint, not an error

---

## Future Architecture

### Planned: Code Actions Layer

```text
User clicks Quick Fix
       ↓
Code Action Provider
       ↓
Docstring Generator
  - Read current docstring
  - Generate corrected version
  - Preserve descriptions
       ↓
Apply WorkspaceEdit
       ↓
Updated docstring in file
```

### Planned: Configuration

User settings:

- `docstringVerifier.enable` - On/off toggle
- `docstringVerifier.pythonPath` - Custom Python path
- `docstringVerifier.docstringStyle` - Google/Sphinx
- `docstringVerifier.disabledChecks` - Disable specific rules

## Performance Considerations

### Optimization Strategies

1. **Caching:** Parse results cached per document version
2. **Debouncing:** 500ms delay after typing stops
3. **Incremental:** Only re-analyze changed functions
4. **Async:** All operations non-blocking

### Current Performance

- **Parse:** ~50-100ms for typical Python file
- **Analyze:** <10ms per function
- **Display:** Instant (VS Code built-in)

**Target:** <200ms total for typical file

## Testing Strategy

### Unit Tests (TypeScript)

- Covering all analyzers
- Shared test utilities to eliminate duplication
- Both positive and negative cases
- Edge case coverage for type interactions

### Integration Tests (Python)

- For AST extractor
- Generator detection
- Async functions
- Multiple returns
- Error handling

### Manual Testing

Example files in `examples/python/`:

- Each diagnostic code has dedicated file
- Mix of incorrect (trigger) and correct (pass) examples

## Monitoring & Debugging

### Logger

Centralized logging with:

- PII sanitization (file paths obfuscated)
- Configurable levels (ERROR/WARN/INFO/DEBUG/TRACE)
- Output channel in VS Code

### Diagnostic Codes

Structured codes enable:

- Filtering in Problems panel
- User configuration (enable/disable rules)
- Analytics (which rules trigger most)

---

For implementation details and development history, see [MVP.md](./MVP.md).

---

(C) MIT, Andrey Krisanov 2025
