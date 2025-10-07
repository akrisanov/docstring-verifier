# Random Notes

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

## Future Roadmap Ideas

### Enhanced Language Support

- [ ] NumPy docstring format
- [ ] Full JSDoc specification support
- [ ] Java (JavaDoc)
- [ ] Go (godoc)
- [ ] Rust (rustdoc)

### Advanced Analysis

- [ ] Integration with Pyright/mypy/ruff for accurate type inference
- [ ] Data flow analysis for side effects
- [ ] Detect async/await mismatches in docstrings
- [ ] Class method inheritance validation
- [ ] Decorator effects on function signatures

### LLM Integration

- [ ] GPT-4/Claude for intelligent docstring generation
- [ ] Natural language explanations for mismatches
- [ ] Context-aware suggestions
- [ ] Support for custom terminology/style guides

### Team Features

- [ ] Workspace-wide docstring coverage reports
- [ ] Team style guide enforcement
- [ ] Pre-commit hooks
- [ ] CI/CD integration (GitHub Actions, GitLab CI)
- [ ] Dashboard for project documentation health
