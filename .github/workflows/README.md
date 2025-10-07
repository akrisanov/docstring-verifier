# GitHub Workflows

This directory contains GitHub Actions workflows for CI/CD automation.

## Workflows

### CI (`ci.yml`)

**Triggers:** Push/PR to `main` or `develop`

**Jobs:**

- **lint-and-typecheck** - ESLint + TypeScript type checking
- **test** - Run tests with code coverage
- **build** - Compile and package extension

**Features:**

- pnpm caching for faster builds
- Parallel job execution
- Artifact upload (compiled extension)
- Code coverage reporting (Codecov)

### CodeQL Analysis (`codeql.yml`)

**Triggers:**

- Push to `main`
- PRs to `main`
- Weekly schedule (Monday midnight)

**Languages:**

- JavaScript/TypeScript
- Python

Security scanning for vulnerabilities and code quality issues.

### Dependency Review (`dependency-review.yml`)

**Triggers:** PRs to `main`

**Checks:**

- Vulnerability scanning (fails on moderate+)
- License compliance (blocks AGPL-3.0, GPL-3.0)

## Setup Instructions

### 1. Required Secrets

Add these to repository Settings → Secrets and variables → Actions:

- **CODECOV_TOKEN** (optional, for coverage reports)
  - Get from: <https://codecov.io>
  - Needed for test coverage tracking

### 2. Branch Protection

Recommended settings for `main` branch:

```yaml
Require status checks to pass:
  - lint-and-typecheck
  - test
  - build
  - dependency-review

Require branches to be up to date: Yes
```

## Local Testing

Test workflows locally with [act](https://github.com/nektos/act):

```bash
# Install act
brew install act  # macOS

# Run CI workflow locally
act push

# Run specific job
act -j lint-and-typecheck
```

## Troubleshooting

### Tests fail on Ubuntu

VS Code tests require Xvfb on Linux. The workflow uses `xvfb-run -a` automatically.

### Cache not working

Clear cache in Actions → Caches, then re-run workflow.
