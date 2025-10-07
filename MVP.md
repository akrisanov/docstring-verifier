# Development Roadmap

---

## Day 1: Foundation

### Objectives

- [x] Scaffold VS Code extension (TypeScript)
- [ ] Setup project structure with parsers/analyzers/diagnostics folders
- [ ] Implement Python AST parser (via `ast` module + child_process)
- [ ] Extract function facts: parameters, types, return statements, raises
- [ ] Parse Google-style docstrings (regex-based)
- [ ] Design language-agnostic interfaces for extensibility

**Milestone:** Console output showing extracted facts from Python functions

## Day 2: Python Docstring Parser

### Parsing Implementation

- [ ] Google-style docstring parser (`Args:`, `Returns:`, `Raises:`)
- [ ] Sphinx/reStructuredText style parser (`:param:`, `:returns:`, `:raises:`)
- [ ] Auto-detect docstring format
- [ ] Handle edge cases: multi-line descriptions, optional parameters, type hints
- [ ] Unit tests for docstring parsing

**Milestone:** Support for 2 popular Python docstring formats

## Day 3: Core Validation Rules - Python

### Validation Rules

- [ ] **Rule 1: Parameter Validation**
  - Parameter names match
  - Types match (if specified)
  - Required vs optional parameters
  - Detect extra/missing parameters

- [ ] **Rule 2: Return Type Validation**
  - Check all return statements in function body
  - Match against documented return type
  - Handle None, yield, multiple returns

- [ ] **Rule 3: Exception Validation**
  - Find all `raise` statements
  - Compare with `Raises:` section
  - Detect undocumented exceptions

- [ ] **Rule 4: Side Effects Detection** (basic)
  - Detect file I/O operations
  - Detect print/logging calls
  - Detect global variable modifications

- [ ] Implement Diagnostic Provider
- [ ] Unit tests for each rule

**Milestone:** 4 validation rules working with diagnostics displayed in VS Code

## Day 4: TypeScript Support

### TypeScript Integration

- [ ] TypeScript Compiler API integration
- [ ] JSDoc parser (`@param`, `@returns`, `@throws`)
- [ ] Adapt all 4 rules for TypeScript/JavaScript
- [ ] Handle TypeScript-specific features: interfaces, generics, union types
- [ ] Unit tests for TypeScript validation

**Milestone:** Full multi-language support (Python + TypeScript)

## Day 5: Code Actions & Quick Fixes

### Quick Fix Implementation

- [ ] **Code Action 1:** "Fix docstring"
  - Auto-generate corrected docstring
  - Preserve existing descriptions
  - Match detected format (Google/Sphinx/JSDoc)

- [ ] **Code Action 2:** "Generate complete docstring"
  - Generate from scratch based on function signature
  - Include all parameters, return type, exceptions

- [ ] **Code Action 3:** "Add missing parameter documentation"
  - Add only missing `@param` entries

- [ ] **Code Action 4:** "Generate test template for mismatch"
  - Create test stub highlighting the discrepancy

- [ ] Smart generation: preserve user-written descriptions
- [ ] Unit tests for code actions

**Milestone:** 4 types of Quick Fixes working in VS Code

## Day 6: Advanced Features

### LLM Enhancement

- [ ] OpenAI/Anthropic API integration
- [ ] Feature flag: `docstringVerifier.useLLM`
- [ ] LLM-powered docstring fixes with rephrasing
- [ ] Fallback to rule-based generation
- [ ] Cost/rate limiting handling

### Polish & UX

- [ ] Extension settings:
  - Preferred docstring format (Google/Sphinx/JSDoc)
  - Severity levels (error/warning/info)
  - Enable/disable specific rules
- [ ] Ignore directives: `# docstring-verifier: ignore`
- [ ] Status bar indicator showing issue count
- [ ] Workspace-level configuration
- [ ] Performance optimizations for large files

**Milestone:** Enhanced user experience and configurability

---

## Day 7: Testing, Documentation & Demo

### Deliverables

- [ ] **Comprehensive Tests**
  - 10+ test cases covering all rules
  - Edge cases: async functions, decorators, nested functions
  - Integration tests in VS Code environment

- [ ] **CI/CD Pipeline**
  - GitHub Actions for automated testing
  - Linting (ESLint + Prettier)
  - Coverage reporting

- [ ] **Documentation**
  - README.md with lean structure:
    - What & Why
    - Demo GIF/video
    - Architecture diagram
    - Getting Started (F5 + pnpm test)
    - Limitations
    - Roadmap
  - Inline code comments

- [ ] **Demo Materials**
  - Record 30-45s GIF: open file → errors → Quick Fix
  - 2-3 screenshots showing different scenarios
  - Example files showcasing all features

- [ ] **Code Quality**
  - Refactor and clean up
  - Remove debug code
  - Consistent naming and formatting

**Milestone:** Production-ready demo + comprehensive documentation

---

(C) MIT, Andrey Krisanov 2025
