# System Design

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
           │  • Initialize registries:     │
           │    - Language handlers        │
           │    - Editor handlers          │
           │  • Setup event handlers:      │
           │    - DocumentEventHandler     │
           │    - ConfigurationHandler     │
           │  • Initialize LLM service     │
           │  • Initialize StatusBar       │
           │  • Register Code Actions      │
           └───────────────┬───────────────┘
                           │
                           │ Get handler for language
                           │
           ┌───────────────▼───────────────┐
           │   Language Handler Registry   │
           │                               │
           │  • register(languageId, ...)  │
           │  • get(languageId)            │
           │  • isSupported(languageId)    │
           │  • resetCache(languageId)     │
           │                               │
           │  Registered Handlers:         │
           │  └─► Python Handler.          │
           │  └─► TypeScript Handler       │
           │  └─► JavaScript Handler       │
           └───────────────┬───────────────┘
                           │
                           │ Returns LanguageHandler
                           │
           ┌───────────────▼───────────────┐
           │      Language Handler         │
           │      (Python Example)         │
           │                               │
           │  • parser: IParser            │
           │  • docstringParsers: Map      │
           │  • analyzers: IAnalyzer[]     │
           │  • selectDocstringParser()    │
           │  • resetCache()               │
           └───────────────┬───────────────┘
                           │
            ┌──────────────┴──────────────┐
            │                             │
            │ Parse                       │ Parse
            ▼                             ▼
  ┌─────────────────┐         ┌─────────────────────┐
  │  Parser Layer   │         │  Docstring Parser   │
  │                 │         │                     │
  │ ┌─────────────┐ │         │ ┌─────────────────┐ │
  │ │   Python    │ │         │ │ Google Style    │ │
  │ │   Parser    │ │         │ │ Parser          │ │
  │ │   (AST)     │ │         │ └─────────────────┘ │
  │ └─────────────┘ │         │                     │
  │                 │         │ ┌─────────────────┐ │
  │ • Extract       │         │ │ Sphinx Style    │ │
  │   function      │         │ │ Parser          │ │
  │   signatures    │         │ └─────────────────┘ │
  │ • Parameters    │         │                     │
  │ • Returns       │         │ • Args, Returns     │
  │ • Yields        │         │ • Raises, Yields    │
  │ • Exceptions    │         │ • Auto-detection    │
  │ • Side effects  │         │ • Multi-line        │
  └─────────────────┘         └─────────────────────┘
            │                             │
            └──────────────┬──────────────┘
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
           │  │  • Exception types      │  │
           │  └─────────────────────────┘  │
           │                               │
           │  ┌─────────────────────────┐  │
           │  │  Side Effects Analyzer  │  │
           │  │  • I/O operations       │  │
           │  │  • Global modifications │  │
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
           │  • Status bar indicator       │
           │    (via StatusBarManager)     │
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

### Generator Support

Functions with `yield` or `yield from` statements are marked as generators:

- `isGenerator: true` flag set
- `yieldStatements[]` array populated

## Extension Points

### Adding New Languages

Language Handler Registry pattern makes it easy to add new languages.

**Steps:**

1. **Create Language Handler Factory** (`src/languages/{language}/factory.ts`)

   ```typescript
   export function createTypeScriptHandler(context: vscode.ExtensionContext): LanguageHandler {
     return {
       parser: new TypeScriptParser(),
       docstringParsers: new Map([['jsdoc', new JSDocParser()]]),
       analyzers: [
         new TypeScriptSignatureAnalyzer(),
         new TypeScriptReturnAnalyzer(),
         new TypeScriptExceptionAnalyzer(),
       ],
       // Optional: selectDocstringParser() if multiple styles
       // Optional: resetCache() for cleanup
     };
   }
   ```

2. **Implement Language Parser** (`src/parsers/{language}/`)
   - Implement `IParser` interface
   - Extract function metadata to `FunctionDescriptor`
   - Use language-specific AST (e.g., TypeScript Compiler API)

3. **Implement Docstring Parser** (`src/docstring/{language}/`)
   - Implement `IDocstringParser` interface
   - Parse documentation to `DocstringDescriptor`
   - Handle language-specific formats (JSDoc, TSDoc, etc.)

4. **Adapt or Create Analyzers** (`src/analyzers/{language}/`)
   - Reuse existing analyzers if logic is universal
   - Create language-specific versions for unique patterns
   - Example: Exception handling differs (try/catch vs raise)

5. **Register in extension.ts**

   ```typescript
   languageRegistry.register('typescript', createTypeScriptHandler(context));
   ```

**That's it!** No need to modify core extension logic.

### Adding New Analyzers

1. Implement `IAnalyzer` interface
2. Add diagnostic codes to `DiagnosticCode` enum
3. Add analyzer to language handler's `analyzers` array
4. Create factory methods in `DiagnosticFactory`

### Adding New Docstring Formats

1. Implement `IDocstringParser` interface
2. Parse sections into `DocstringDescriptor`
3. Add format detection logic (optional)
4. Register parser in language handler's `docstringParsers` Map

### Multi-Language Architecture

**Key Components:**

1. **LanguageHandler Interface** (`src/languages/types.ts`)
   - Defines contract for all language implementations
   - Contains parser, docstring parsers, and analyzers
   - Optional methods for language-specific behavior

2. **LanguageHandlerRegistry** (`src/languages/registry.ts`)
   - Centralized registry for language handlers
   - Methods: `register()`, `get()`, `isSupported()`, `resetCache()`
   - Enables dynamic language registration

3. **Language Factories** (`src/languages/{language}/factory.ts`)
   - Create and configure language-specific handlers
   - Encapsulate initialization logic
   - Example: `createPythonHandler(context)`

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

### DSV204 Severity Level

**Decision:** Multiple return types as Information, not Warning

**Rationale:**

- Common pattern in Python (early returns, error handling)
- Not always incorrect (may need union type documentation)
- Helpful hint, not an error

---

## Code Actions Layer

### Architecture

```text
User clicks Quick Fix (💡)
       ↓
Code Action Provider
  - Filter diagnostics by source
  - Route to appropriate fix provider
       ↓
Fix Provider (currently: ParameterFixProvider)
  - Get diagnostic context
  - Find function for diagnostic
       ↓
LLM Service (optional, if enabled)
  - Generate parameter description
  - Use GitHub Copilot Language Model API
  - Cache results (LRU cache, 1000 items)
  - Timeout: 5s (configurable)
  - Fallback to "TODO" on failure
       ↓
Editor Handler Registry
  - Get editor for language + style
  - Create fresh editor instance (factory pattern)
       ↓
Docstring Editor (e.g., GoogleDocstringEditor)
  - Load existing docstring
  - Parse into editable structure
  - Apply surgical edit:
    * Add/remove parameter line
    * Update type/optional marker
    * Add/remove return section
    * Add/remove exception entry
  - Preserve all user descriptions
  - Maintain formatting
       ↓
Create WorkspaceEdit
  - Replace docstring range
  - Apply to document
       ↓
Updated docstring in file
```

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

- Covering all analyzers (signature, return, exception, side effects)
- Shared test utilities to eliminate duplication
- Both positive and negative cases
- Edge case coverage for type interactions
- StatusBarManager tests
- Editor and Code Actions tests

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
