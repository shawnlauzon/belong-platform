# Suggested Commands

## Installation and Setup
```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase and Mapbox credentials
```

## Development Commands
```bash
# Run tests (unit tests only)
pnpm test

# Run tests with verbose logging (shows console.log)
VITEST_VERBOSE=true pnpm test

# Run tests in watch mode
pnpm test:watch

# Run integration tests
pnpm -w test:integration

# TypeScript type checking
pnpm typecheck          # Check all packages
pnpm typecheck:api      # Check API package only

# Build all packages
pnpm build

# Lint code
pnpm lint

# Format code
pnpm format
```

## Quality Assurance Commands
```bash
# Pre-commit verification (run before committing)
pnpm lint && pnpm typecheck && pnpm test && pnpm build

# TDD workflow
pnpm tdd   # Runs lint, typecheck, and tests

# Full QA (includes integration tests)
pnpm qa    # Runs lint, typecheck, all tests, and build
```

## Database Commands
```bash
# Generate TypeScript types from database schema
pnpm gen:db-types

# Apply database migrations (use Supabase MCP)
# Use the mcp__supabase tools for database operations
```

## Darwin/macOS System Commands
```bash
# Common utilities
ls -la              # List files with details
find . -name "*.ts" # Find TypeScript files
grep -r "pattern"   # Search for pattern (use ripgrep 'rg' instead)
rg "pattern"        # Preferred: ripgrep for fast searching

# Git commands
git status
git diff
git add .
git commit -m "message"
git log --oneline
```

## E2E Testing
```bash
# Install Playwright browsers
pnpm e2e:install

# Run E2E tests
pnpm test:e2e

# Run E2E tests with UI
pnpm test:e2e:ui

# Debug E2E tests
pnpm test:e2e:debug

# Show E2E test report
pnpm test:e2e:report
```

## Publishing
```bash
# Before publishing
pnpm qa                    # Run full QA
# Bump version in package.json
git commit -m "bump version"
git tag v0.2.3            # Tag with version
npm publish               # Publish to npm
```