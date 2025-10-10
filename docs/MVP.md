# Development Roadmap

## Current Status

**Day 1:** ✅ Complete
**Day 2:** ✅ Complete
**Day 3:** ✅ Complete
**Day 4:** ✅ Complete (Python support)
**Day 5:** In Progress (Editor implementation complete, integration pending)

## Day 1: Entry Point + End-to-End Skeleton

### Objectives

- [x] Scaffold VS Code extension (TypeScript)
- [x] Setup project structure with parsers/analyzers/diagnostics folders
- [x] Entry Point (`extension.ts`)
  - Extension activation/deactivation
  - Register diagnostic collection
  - Document listeners (onChange, onSave)
  - Logger with no-PII sanitization
- [x] Types & Interfaces
- [x] Mock Python Parser
- [x] Simple Diagnostic Provider
  - Creates warning: "Parameter 'x' is missing in docstring"
  - Shows yellow squiggly line in VS Code
  - Integrated into extension.ts analyzeDocument()
- [x] Manual Test
  - Press F5 → Extension Development Host
  - Open any .py file → see diagnostic
  - Warning appears in Problems panel
- [x] GitHub Actions
  - Run tests on push/PR
  - ESLint checks
  - TypeScript compilation
  - Coverage reporting

**Milestone:** Extension activates and shows mock diagnostic in VS Code

## Day 2: Real Python Parser + Docstring Parser

### Implementation

- [x] Python AST Extractor
  - Extracts function signatures, parameters, return types, exceptions
  - Uses Python AST module (stdlib only)
  - Outputs TypeScript-compatible JSON (camelCase, VS Code Range format)
- [x] Python Parser (TypeScript wrapper)
  - `PythonExecutor` class for subprocess management
  - `PythonParser` class implementing `IParser` interface
- [x] Google-style Docstring Parser
  - Parses Args, Returns, Raises, Note sections
  - Handles alternative section names (Arguments, Return, Throws, etc.)
  - Supports multi-line descriptions
  - Implements IDocstringParser interface
- [x] Integration
  - Replaced MockParser with PythonParser
  - Parse docstrings with GoogleDocstringParser
  - Basic parameter validation (DSV101, DSV102)
  - Test on real Python files

**Current Status:** Python AST Extractor, TypeScript wrapper, Google-style docstring parser, and basic integration complete. Extension now analyzes real Python code! Next: Core analyzers for returns and exceptions.

**Milestone:** Extension analyzes real Python code with docstrings

**Manual Testing:**

1. Press F5 → Extension Development Host
2. Open `examples/python/missing_parameter.py`
3. See diagnostic: "Parameter 'x' is missing in docstring for function 'add_numbers'"
4. No diagnostic for `subtract` function (properly documented)

## Day 3: Core Analyzers + Diagnostic Provider

### Validation Rules

- [x] Signature Analyzer
  - [x] DSV101: Parameter in docstring but not in code
  - [x] DSV102: Parameter in code but not in docstring
  - [x] DSV103: Parameter type mismatch
  - [x] DSV104: Optional/required mismatch
- [x] Return Analyzer
  - [x] DSV201: Return type mismatch
  - [x] DSV202: Missing return in docstring
  - [x] DSV203: Docstring says returns, but function is void
  - [x] DSV204: Multiple inconsistent return types
  - [x] DSV205: Generator should use Yields, not Returns
- [x] Exception Analyzer
  - [x] DSV301: Exception raised but not documented
  - [x] DSV302: Exception documented but not raised
  - [x] Track exceptions in function body
- [x] Diagnostic Factory
  - Create `vscode.Diagnostic` with code, severity, range
  - Assign diagnostic codes (DSV101-302)
  - Set proper severity levels
- [x] Integration into Extension
  - Run all analyzers on parsed functions
  - Collect mismatches
  - Create and display diagnostics
  - Show in Problems panel

**Milestone:** Complete - All 3 analyzer types (Signature, Return, Exception) working with 11 validation rules (DSV101-104, DSV201-205, DSV301-302)

## Day 4: Polish Python and TypeScript Support

### Polish Python

- [x] Sphinx Docstring Parser
  - Parse `:param:`, `:type:`, `:returns:`, `:raises:`
  - Auto-detect Google vs Sphinx style
- [x] Side Effects Analyzer
  - [x] DSV401: Detect file I/O, print, global modifications
  - [x] Heuristic-based detection
- [x] Better Error Messages
  - [x] More descriptive diagnostic messages with actionable hints
  - [x] Add related information for diagnostics (DSV102, DSV202, DSV301)
  - [x] Update interface to pass documentUri to analyzers
- [x] Settings
  - [x] `docstringVerifier.enable` - Enable/disable extension
  - [x] `docstringVerifier.logLevel` - Logging level (error/warn/info/debug/trace)
  - [x] `docstringVerifier.pythonPath` - Custom Python interpreter path
  - [x] `docstringVerifier.pythonScriptPath` - Custom ast_extractor.py path (dev only)
  - [x] `docstringVerifier.preferUv` - Prefer uv for running Python scripts
  - [x] `docstringVerifier.docstringStyle` - Style selection (auto/google/sphinx)
  - [x] Auto-detection of docstring style (Google vs Sphinx)
  - [x] Configuration change listener for real-time enable/disable

**Milestone:** Complete - Python support polished with all validation rules, Sphinx parser, side effects detection, and comprehensive settings

### TypeScript Support

- [ ] TypeScript Parser
  - TypeScript Compiler API integration
  - Extract functions, parameters, return types
- [ ] JSDoc Parser
  - Parse `@param`, `@returns`, `@throws`
  - Handle TypeScript-specific features
- [ ] Adapt Analyzers
  - Signature Analyzer for TypeScript
  - Return Analyzer for TypeScript
  - Exception Analyzer for TypeScript
- [ ] Test on TypeScript files

**Milestone:** Multi-language support (Python + TypeScript) - Architecture ready, implementation pending

## Day 5: Code Actions: Quick Fix Implementation

### Core Principles

- **Surgical edits only** - modify only what's broken
- **Preserve user content** - keep all descriptions and formatting
- **No full regeneration** - edit specific lines/sections

### Tasks

- [x] Code Action Provider
  - Register provider for Quick Fixes
  - Filter diagnostics by code
  - Provide list of available actions
- [x] Docstring Editor
  - Parse existing docstring into editable structure
  - Add single parameter line to Args section (DSV102)
  - Remove single parameter line from Args section (DSV101)
  - Update parameter type inline (DSV103)
  - Update parameter optional marker (DSV104)
  - Update return type (DSV201)
  - Add/remove return section (DSV202, DSV203)
  - Add/remove exception entries (DSV301, DSV302)
  - Surgical edits: modify only broken parts, preserve formatting
  - Regex-based exact name matching (prevents substring false matches)
  - Google style support (23 tests, 100% coverage)
  - TODO: Sphinx style support
- [x] Editor Handler Registry
  - Factory pattern for creating editor instances
  - Language and style-based editor selection
  - State isolation between editor instances
  - Auto-detection of docstring styles
- [ ] Parameter Quick Fixes (integration with Editor)
  - DSV101: Remove extra parameter from docstring
  - DSV102: Add missing parameter to docstring
  - DSV103: Fix parameter type mismatch
  - DSV104: Fix optional/required mismatch
- [ ] Return Quick Fixes
  - DSV201: Fix return type mismatch
  - DSV202: Add missing return documentation
  - DSV203: Remove incorrect return documentation
- [ ] Exception Quick Fixes
  - DSV301: Add missing exception to docstring
  - DSV302: Remove undocumented exception
- [ ] Generate Complete Docstring Action (fallback)
  - Only for functions **without any docstring**
  - Use configured style (Google/Sphinx)
  - Generate from scratch with placeholder descriptions
- [ ] Test Quick Fixes
  - Lightbulb appears on diagnostics
  - Fixes apply correctly and preserve content
  - Multiple fixes available
  - User descriptions are never lost

**Current Status:** Editor implementation complete with comprehensive surgical edit capabilities. Integration with Quick Fix providers in progress.

**Milestone:** Working Quick Fixes with surgical edits that preserve user documentation

## Day 6: Advanced Features

### LLM Enhancement

- [ ] OpenAI/Anthropic API integration
  - Feature flag: `docstringVerifier.useLLM`
  - LLM-powered docstring fixes with rephrasing
  - Fallback to rule-based generation
  - Cost/rate limiting handling

### TypeScript Support Enhancement

- [ ] TypeScript Parser with Compiler API
- [ ] JSDoc parser
- [ ] Adapt all analyzers for TypeScript
- [ ] Test on TypeScript files

### Polish & UX

- [ ] Additional Settings
  - Severity levels configuration
  - Enable/disable specific rules
  - `disabledChecks` array
  - `severityOverrides` object
- [ ] Ignore Directives
  - `# docstring-verifier: ignore` comment support
  - Ignore entire functions or specific lines
- [ ] Performance Optimizations
  - Caching analyzed results
  - Debouncing document changes (500ms)
  - Async processing
- [ ] Status Bar Indicator
  - Show issue count
  - Click to open Problems panel
- [ ] Better Test Coverage
  - Edge cases: async functions, decorators, nested functions
  - Multiple docstring formats
  - Error handling

**Milestone:** Polished extension with good UX

## Day 7: Testing, Documentation & Demo

### Testing

- [ ] Add more tests
  - Parser tests (Python AST, docstring parsing)
  - Analyzer tests (each rule with valid/invalid cases)
  - Generator tests (docstring generation)
  - Test fixtures in `src/test/fixtures/`
- [ ] Add integration tests
  - End-to-end: Open file → Analyze → Show diagnostics
  - Quick Fix application
  - Multi-file scenarios
- [ ] Check edge cases
  - Async functions
  - Decorators
  - Nested functions
  - Class methods
  - Empty docstrings
  - Malformed docstrings

---

### Final Check

- [ ] Extension activates without errors
- [ ] All diagnostics show correctly
- [ ] Quick Fixes work
- [ ] Settings are respected
- [ ] Performance is acceptable (<500ms analysis)
- [ ] No console errors in Extension Development Host

---

(C) MIT, Andrey Krisanov 2025
