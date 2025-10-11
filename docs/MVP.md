# MVP Roadmap

## Current Status

**🟢 Ready:** Core validation (11 rules), parameter Quick Fixes, LLM enhancement
(GitHub Copilot), comprehensive testing.

**🟡 In Progress:** Return/exception Quick Fix providers (editor methods ready),
polish & UX improvements (e.g. debouncing).

**🔵 Planned:** TypeScript/JavaScript support, additional LLM providers.

---

## Priority 1: Core Validation 🟢

Essential features for detecting docstring issues in Python code.

### Extension Infrastructure

- [x] VS Code extension scaffolding (TypeScript)
- [x] Extension activation/deactivation
- [x] Document event listeners (onChange, onSave)
- [x] Diagnostic collection and display
- [x] Logger with PII sanitization
- [x] GitHub Actions CI/CD (tests, linting, coverage)

### Python Parsing

- [x] Python AST Extractor (ast_extractor.py)
  - Extract function signatures, parameters, return types, exceptions
  - VS Code Range format output
  - TypeScript-compatible JSON
- [x] Python Parser wrapper (TypeScript)
  - Subprocess management for Python execution
  - IParser interface implementation
- [x] Google-style docstring parser
  - Parse Args, Returns, Raises, Note sections
  - Multi-line descriptions
  - Alternative section names support
- [x] Sphinx-style docstring parser
  - Parse `:param:`, `:type:`, `:returns:`, `:raises:`
  - Auto-detection of Google vs Sphinx style

### Validation Rules (11 total)

- [x] **Signature Validation (DSV101-104)**
  - DSV101: Parameter in docstring but not in code
  - DSV102: Parameter in code but not in docstring
  - DSV103: Parameter type mismatch
  - DSV104: Optional/required mismatch
- [x] **Return Validation (DSV201-205)**
  - DSV201: Return type mismatch
  - DSV202: Missing return in docstring
  - DSV203: Docstring says returns, but function is void
  - DSV204: Multiple inconsistent return types
  - DSV205: Generator should use Yields, not Returns
- [x] **Exception Validation (DSV301-302)**
  - DSV301: Exception raised but not documented
  - DSV302: Exception documented but not raised
- [x] **Side Effects Detection (DSV401)**
  - Detect file I/O, print statements, global modifications

### Configuration

- [x] `docstringVerifier.enable` - Enable/disable extension
- [x] `docstringVerifier.logLevel` - Logging level
- [x] `docstringVerifier.pythonPath` - Custom Python interpreter
- [x] `docstringVerifier.pythonScriptPath` - Custom ast_extractor.py path
- [x] `docstringVerifier.preferUv` - Prefer uv for Python execution
- [x] `docstringVerifier.docstringStyle` - Style selection (auto/google/sphinx)
- [x] Real-time configuration updates

---

## Priority 2: Quick Fixes for Parameters 🟢

Surgical edits to fix parameter-related issues without regenerating docstrings.

### Docstring Editor (Google Style)

- [x] Parse existing docstring into editable structure
- [x] Add single parameter to Args section (DSV102)
- [x] Remove single parameter from Args section (DSV101)
- [x] Update parameter type inline (DSV103)
- [x] Update parameter optional marker (DSV104)
- [x] Regex-based exact name matching
- [x] Preserve user descriptions and formatting
- [x] 23 tests, 100% coverage

### Editor Infrastructure

- [x] Editor Handler Registry
  - Factory pattern for editor instances
  - Language and style-based selection
  - State isolation between instances
- [x] Code Action Provider
  - Register Quick Fix provider
  - Filter diagnostics by code
  - Provide actionable fixes

### Parameter Quick Fixes

- [x] DSV101: Remove extra parameter from docstring
- [x] DSV102: Add missing parameter to docstring
- [x] DSV103: Fix parameter type mismatch
- [x] DSV104: Fix optional/required mismatch

---

## Priority 3: Quick Fixes for Returns & Exceptions 🟡

Complete the Quick Fix implementation for all diagnostic types.

### Docstring Editor (Google Style) - Returns & Exceptions

- [x] Add return section to docstring
- [x] Remove return section from docstring
- [x] Update return type inline
- [x] Add exception to Raises section
- [x] Remove exception from Raises section
- [x] Tests for all return/exception methods

### Return Quick Fix Providers (Code Actions)

- [ ] DSV201: Fix return type mismatch
- [ ] DSV202: Add missing return documentation
- [ ] DSV203: Remove incorrect return documentation

### Exception Quick Fix Providers (Code Actions)

- [ ] DSV301: Add missing exception to docstring
- [ ] DSV302: Remove undocumented exception

### Docstring Generation (Fallback)

- [ ] Generate complete docstring for functions **without any docstring**
- [ ] Use configured style (Google/Sphinx)
- [ ] Placeholder descriptions for manual completion

### Testing & Integration

- [ ] Test all Quick Fixes in Extension Development Host
- [ ] Verify lightbulb appears on diagnostics
- [ ] Ensure fixes apply correctly
- [ ] Validate user descriptions are preserved

**Milestone:** Complete Quick Fix support for all 11 diagnostic rules + docstring generation for undocumented functions.

---

## Priority 4: TypeScript/JavaScript Support 🔵

Extend validation to TypeScript and JavaScript with JSDoc.

### TypeScript Parsing

- [ ] TypeScript Parser with Compiler API
  - Extract functions, parameters, return types
  - Handle TypeScript-specific features (generics, union types, etc.)
- [ ] JSDoc Parser
  - Parse `@param`, `@returns`, `@throws`
  - Type annotation handling

### Validation Adaptation

- [ ] Adapt Signature Analyzer for TypeScript
- [ ] Adapt Return Analyzer for TypeScript
- [ ] Adapt Exception Analyzer for TypeScript
- [ ] Test on TypeScript files

### Editor Support

- [ ] JSDoc Editor for Quick Fixes
- [ ] Register TypeScript-specific handlers
- [ ] Test Quick Fixes on TypeScript/JavaScript files

---

## Priority 5: Polish & UX Improvements 🟡

Enhance user experience and extension usability.

### Advanced Configuration

- [ ] Severity level overrides per rule
- [ ] Enable/disable specific rules (`disabledChecks` array)
- [ ] Custom severity mapping (`severityOverrides` object)

### Ignore Directives

- [ ] `# docstring-verifier: ignore` comment support
- [ ] Ignore entire functions or specific diagnostics
- [ ] Ignore by rule code (e.g., `# docstring-verifier: ignore DSV102`)

### Performance Optimizations

- [x] Caching analyzed results (LRU cache)
- [ ] Debouncing document changes (500ms)
- [ ] Async processing for large files
- [x] Target: <500ms analysis time

### UI Enhancements

- [x] Status bar indicator showing issue count
- [x] Click status bar to open Problems panel
- [x] Better diagnostic messages with actionable hints
- [x] Code action titles with clear explanations

---

## Priority 6: LLM Enhancement  🟡

Optional AI-powered docstring improvements for better descriptions.

### LLM Integration

- [x] GitHub Copilot API integration (via VS Code Language Model API)
- [x] Feature flag: `docstringVerifier.useLLM`
- [x] LLM-powered parameter description enhancement
- [x] Fallback to TODO placeholders when LLM unavailable
- [x] Provider selection (`docstringVerifier.llmProvider`)
- [x] Graceful degradation on errors
- [x] Tests for GitHub Copilot service

### Enhanced Quick Fixes

- [x] `enhanceParameterDescription` command
- [x] AI-generated parameter descriptions
- [x] Integration with Parameter Quick Fixes (DSV102)
- [x] Replace TODO placeholders with AI descriptions
- [ ] "Enhance with AI" code action in lightbulb menu
- [ ] Rephrase existing descriptions (not just TODO)
- [ ] Generate function summaries
- [ ] OpenAI/Anthropic providers (future)

GitHub Copilot integration complete with automatic parameter description generation. Future: more providers and enhancement options.

---

## Priority 7: Testing & Quality  🟢

Comprehensive testing and edge case handling.

### Unit Tests

- [x] Parser tests (Python AST, docstring parsing)
- [x] Analyzer tests for each validation rule
- [x] Editor tests for all Quick Fix operations
- [x] Test fixtures for valid/invalid cases

### Integration Tests

- [x] End-to-end: Open file → Analyze → Show diagnostics
- [ ] Quick Fix application and verification
- [ ] Multi-file scenarios
- [ ] Configuration change handling

### Edge Cases

- [x] Async functions and generators
- [x] Decorators
- [x] Nested functions
- [x] Class methods (instance, class, static)
- [x] Empty/malformed docstrings
- [x] Unicode and special characters

---

## Quality Gates

- [x] Extension activates without errors
- [x] All diagnostics show correctly
- [x] Quick Fixes work reliably
- [x] Settings are respected
- [x] Performance targets met (<500ms)
- [x] No console errors in development

---

(C) MIT, Andrey Krisanov 2025
