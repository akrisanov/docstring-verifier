# Development Roadmap

**Philosophy:** Build working extension first, then enhance with real parsers.
Every day should produce a demonstrable feature in VS Code.

## 📊 Current Status

**Day 1:** ✅ Complete
**Day 2:** 🔄 In Progress (Python AST Extractor complete, TypeScript wrapper next)

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
- [ ] Python Parser (TypeScript wrapper)
  - Spawn Python subprocess: `python3 ast_extractor.py <file>`
  - Parse JSON output
  - Map to `FunctionDescriptor` interface
  - Error handling: timeout, fallback, logging
- [ ] Google-style Docstring Parser
  - Regex for section headers: `Args:`, `Returns:`, `Raises:`
  - Parse parameter lines: `name (type): description`
  - Parse return section
  - Parse exceptions
  - Map to `DocstringInfo` interface
- [ ] Integration
  - Replace mock parser with real parser
  - Test on real Python files
  - Update diagnostic logic to use parsed data

**Current Status:** Python AST Extractor complete with tests and docs. Next: TypeScript wrapper.

**Milestone:** Extension analyzes real Python code with docstrings

## Day 3: Core Analyzers + Diagnostic Provider

### Validation Rules

- [ ] Signature Analyzer
  - DSV101: Parameter in docstring but not in code
  - DSV102: Parameter in code but not in docstring
  - DSV103: Parameter type mismatch
  - DSV104: Optional/required mismatch
- [ ] Return Analyzer
  - DSV201: Return type mismatch
  - DSV202: Missing return in docstring
  - DSV203: Docstring says returns, but function is void
  - Handle multiple returns, yield, None
- [ ] Exception Analyzer
  - DSV301: Exception raised but not documented
  - DSV302: Exception documented but not raised
  - Track exceptions in function body
- [ ] Diagnostic Factory
  - Create `vscode.Diagnostic` with code, severity, range
  - Assign diagnostic codes (DSV101-302)
  - Set proper severity levels
- [ ] Integration into Extension
  - Run all analyzers on parsed functions
  - Collect mismatches
  - Create and display diagnostics
  - Show in Problems panel

**Milestone:** 3 types of validation rules working with proper diagnostics

## Day 4: Polish Python and TypeScript Support

### Polish Python

- [ ] Sphinx Docstring Parser
  - Parse `:param:`, `:type:`, `:returns:`, `:raises:`
  - Auto-detect Google vs Sphinx style
- [ ] Side Effects Analyzer
  - DSV401: Detect file I/O, print, global modifications
  - Heuristic-based detection
- [ ] Better Error Messages
  - More descriptive diagnostic messages
  - Add related information for diagnostics
- [ ] Settings
  - `docstringVerifier.enable`
  - `docstringVerifier.logLevel`
  - `docstringVerifier.pythonPath`
  - `docstringVerifier.docstringStyle`
- [ ] Unit Tests
  - Test fixtures for valid/invalid cases
  - Parser tests
  - Analyzer tests

**Milestone:** Polished Python support with 2 docstring formats and 4 validation rules

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

**Milestone:** Multi-language support (Python + TypeScript)

## Day 5: Code Actions (Quick Fixes)

### Quick Fix Implementation

- [ ] Code Action Provider
  - Register provider for Quick Fixes
  - Filter diagnostics by code
  - Provide list of available actions
- [ ] Fix Docstring Action
  - Read current docstring
  - Generate corrected version
  - Preserve existing descriptions
  - Apply edit to document
  - Handle all diagnostic types (DSV101-302)
- [ ] Docstring Generator
  - Generate Google-style docstrings
  - Generate Sphinx-style docstrings
  - Use function signature to create template
  - Infer types from code
- [ ] Generate Complete Docstring Action
  - Generate from scratch for functions without docstrings
  - Use configured style (Google/Sphinx)
- [ ] Add Missing Parameters Action
  - Add only missing parameter entries
  - Preserve existing documentation
- [ ] Test Quick Fixes
  - Lightbulb appears on diagnostics
  - Fixes apply correctly
  - Multiple fixes available

**Milestone:** Working Quick Fixes with auto-generation

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
