# Suggested Commands for Belong Platform

## Development Commands

### Installation
```bash
pnpm install
```

### Testing
```bash
# Run all unit tests
pnpm test

# Run unit tests with coverage
pnpm test:coverage

# Run unit tests in watch mode
pnpm test:watch

# Run integration tests
pnpm test:integration

# Run integration tests in watch mode
pnpm test:integration:watch

# Run acceptance tests
pnpm test:acceptance

# Run acceptance tests in watch mode  
pnpm test:acceptance:watch

# Run all tests (unit + integration + acceptance)
pnpm test:complete

# Run verbose tests (shows console.log statements)
VITEST_VERBOSE=true pnpm test
```

### TypeScript & Linting
```bash
# Type checking (all packages)
pnpm typecheck

# Type checking (API package only)
pnpm typecheck:api

# Lint all packages
pnpm lint

# Format code
pnpm format

# Check package dependencies
pnpm manypkg
```

### Build
```bash
# Build all packages
pnpm build

# Build with validation
pnpm build:validate
```

### Development Workflow
```bash
# TDD workflow (lint + typecheck + test)
pnpm tdd

# QA workflow (full validation)
pnpm qa

# Pre-commit verification
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

## Git Commands
```bash
# Standard git commands for Darwin system
git status
git add .
git commit -m "message"
git push
git pull
git log --oneline
```

## System Commands (Darwin)
```bash
# File operations
ls -la
find . -name "*.ts" -type f
grep -r "pattern" .
cd directory
pwd
```