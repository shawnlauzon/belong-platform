This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Important

- ALL instructions within this document MUST BE FOLLOWED, these are not optional unless explicitly stated.
- DO NOT edit more code than you have to.
- DO NOT WASTE TOKENS, be succinct and concise.
- **Always use IDE diagnostics to validate code (including tests!) after implementation**

## Code Style and Best Practices

- Follow established code patterns and conventions within the platform
- Maintain consistent naming conventions across all features
- A maximum file size is around 500 lines
- Only catch errors for 1. logging and rethrowing or 2. if they are specifically expected

## Development Commands

```bash
# Install dependencies
pnpm install

# Run unit tests
pnpm test

# Run tests with verbose logging (shows console.log statements)
VITEST_VERBOSE=true pnpm test

# TypeScript type checking
pnpm typecheck

# Build the package
pnpm build

# Lint the package
pnpm lint

# Pre-commit verification (lint, typecheck, tests, and clean build)
pnpm lint && pnpm typecheck && pnpm test && pnpm build

# Run integration tests
pnpm test:integration
```

## Architecture Overview

Belong Network Platform is a TypeScript library for building hyper-local community applications with React Query and Supabase.

### Package Structure

- **@belongnetwork/platform** - Single package containing the complete data layer with React Query hooks, services, and utilities for auth, communities, resources (including events), feed, images, shoutouts, trust-scores, and users

### Tech Stack

- **Frontend**: React 18, TypeScript, TanStack Query (React Query) v5
- **Database**: Supabase (PostgreSQL + PostGIS for spatial data)
- **Build**: Vite
- **Testing**: Vitest with jsdom and Testing Library

## Development Guidelines

### Code Patterns

- Study existing files for established patterns before creating new ones
- Follow the feature-based architecture with hooks, api, transformers, and types

### Type Safety

- NEVER use `any` types - always create proper interfaces, union types, or use type assertions
- All functions and components must have explicit type annotations
- Use generated database types from `src/shared/types/database.ts`
- Prefer type-safe patterns over casting or type assertions

### Testing Approach

- Write unit tests only for functionality that does not interact with the database
- Write integration tests for functionality that does interact with the database

- **Unit tests**: Located in `__tests__` directories within each feature - test isolated logic with mocked dependencies
- **Integration tests**: Located in `tests/integration` directory - test real end-to-end behavior with live database
- Skipping tests is not an acceptable way to make tests pass
- A problem must fail the test; logging errors is only for debugging
- **ALWAYS use createFake\* utilities from src/test-utils for generating test data**
- Use faker to generate data for tests and to document expected values

## Code Safety Guidelines

- Prefer function definition to prevent error conditions rather than checking at runtime
- Do not make checks at runtime for conditions which are impossible by the function definition

## Development Principles

- A task is only complete when build, typecheck, unit tests, and integration tests are all successful

## Database Management

- Use supabase-local MCP to understand the database schema

### Migration files

- Always create a migration file before making changes to the database
- Minimize the number of individual migration files; if one is in the workspace, do not create another
- After a migration file is created, run `pnpx supabase db reset` to apply it to the local database`
- Never push a migration file to production; that is my job.

## Memory

- When asked to look at the database definition, look at `src/shared/types/database.ts`
- NEVER MANUALLY UPDATE THE DATABASE.TS FILE. Always make changes via a database migration and then pull the types
- To update the database.ts file, run `pnpm run gen:db-types` from the project root
- If you create the same code more than twice, extract it into a shared function
- Remove old code when it is no longer used
- When you believe you have fixed a problem, run the test to confirm before continuing
- Use supabase mcp for supabase commands except for gen:db-types to generate types into database.ts
