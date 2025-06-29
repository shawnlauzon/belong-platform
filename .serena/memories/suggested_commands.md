# Essential Development Commands

## Core Development
```bash
# Install dependencies
pnpm install

# Run tests (API package only)
pnpm test

# Run tests with verbose logging (shows console.log statements)
VITEST_VERBOSE=true pnpm test

# TypeScript type checking
pnpm typecheck          # Check all packages
pnpm typecheck:api      # Check API package only

# Build all packages
pnpm build

# Lint all packages
pnpm lint

# Format code
pnpm format
```

## Testing Commands
```bash
# Run integration tests
pnpm test:integration

# Run acceptance tests  
pnpm test:acceptance

# Run all tests
pnpm test:complete

# Watch mode for different test types
pnpm test:watch
pnpm test:integration:watch
pnpm test:acceptance:watch
```

## Quality Assurance
```bash
# Pre-commit verification (lint, typecheck, tests, and clean build)
pnpm lint && pnpm typecheck && pnpm test && pnpm build

# TDD workflow
pnpm tdd

# Full QA process
pnpm qa
```

## Database Commands
```bash
# Update database types (from types package directory)
pnpm run gen:db-types
```

## System Commands (Darwin)
- Standard Unix commands: `git`, `ls`, `cd`, `grep`, `find`
- Package manager: `pnpm` (specified version 8.10.0)