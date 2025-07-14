This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Important

- ALL instructions within this document MUST BE FOLLOWED, these are not optional unless explicitly stated.
- DO NOT edit more code than you have to.
- DO NOT WASTE TOKENS, be succinct and concise.

## CRITICAL: Error Handling Guidelines

**NEVER SWALLOW DATABASE/API ERRORS**

### ❌ NEVER DO THIS:

```typescript
if (error) {
  return [];  // ❌ SILENT ERROR SWALLOWING - NEVER OK
}

if (error || !data) {
  return [];  // ❌ HIDES CRITICAL SQL FAILURES
}

} catch (error) {
  return { items: [], hasMore: false };  // ❌ MASKS DATABASE OUTAGES
}
```

### ✅ ALWAYS DO THIS:

```typescript
if (error) {
  throw error;  // ✅ PROPER - Let React Query handle errors
}

if (!data) {
  return [];  // ✅ OK - No data is different from errors
}

} catch (error) {
  logger.error('Context info', { error });
  throw error;  // ✅ PROPER - Log and re-throw
}
```

**Why this matters:**

- Silent error swallowing makes debugging impossible
- Tests see empty results instead of actual SQL errors
- Users see mysterious empty states instead of proper error handling
- React Query error boundaries can't work if errors are swallowed

## Documentation

For detailed information about the platform, refer to these documents:

- **[README.md](./README.md)** - Getting started, basic usage, and API reference
- **[USAGE.md](./USAGE.md)** - Advanced usage patterns and best practices
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Internal architecture and design decisions
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Development workflow and guidelines
- **[UNIT_TESTING.md](./UNIT_TESTING.md)** - Comprehensive unit testing patterns
- **[INTEGRATION_TESTING.md](./INTEGRATION_TESTING.md)** - Integration testing with real database

## Development Commands

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Run tests with verbose logging (shows console.log statements)
VITEST_VERBOSE=true pnpm test

# TypeScript type checking
pnpm typecheck

# Build the package
pnpm build

# Lint the package
pnpm lint

# Format code
pnpm format

# Pre-commit verification (lint, typecheck, tests, and clean build)
pnpm lint && pnpm typecheck && pnpm test && pnpm build

# Run integration tests
pnpm test:integration
```

## Architecture Overview

Belong Network Platform is a TypeScript library for building hyper-local community applications with React Query and Supabase.

### Package Structure

- **@belongnetwork/platform** - Single package containing the complete data layer with React Query hooks, services, and utilities for auth, communities, resources, events, conversations, shoutouts, and users

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

### TDD

- Do not write a new test case if you are fixing a unit test failure
- If you are not fixing a unit test failure, write a test before writing the code
- Use the test file to guide the implementation
- See [UNIT_TESTING.md](./UNIT_TESTING.md) for detailed testing patterns

### Testing

- **Unit tests**: Located in `__tests__` directories within each feature - test isolated logic with mocked dependencies
- **Integration tests**: Located in `tests/integration` directory - test real end-to-end behavior with live database
- **Critical**: Integration tests validate what unit tests cannot - real database constraints, triggers, and cross-component interactions
- Skipping tests is not an acceptable way to make tests pass
- A problem must fail the test; logging errors is only for debugging
- **ALWAYS use createFake\* utilities from src/test-utils for generating test data**
- Use faker to generate data for tests and to document expected values

### Unit Test Requirements

- **Test behavior, not implementation**: Unit tests must verify WHAT the code accomplishes, not HOW it does it
- **Avoid brittle assertions**: Never test internal implementation details like specific database query method calls
- **Focus on service contracts**: Test inputs, outputs, error conditions, and business logic
- **Examples of what NOT to test**:
  - `expect(mockQuery.select).toHaveBeenCalledWith('*')`
  - `expect(mockSupabase.from).toHaveBeenCalledWith('table_name')`
  - `expect(mockQuery.update).toHaveBeenCalled()`
  - Internal query chain order or specific method calls
- **Examples of what TO test**:
  - `expect(result.id).toBe(expectedValue)` - Service contracts
  - `expect(mockSupabase.auth.getUser).toHaveBeenCalled()` - Authentication requirements
  - `expect(result).toHaveLength(expectedCount)` - Output verification
  - `expect(error).toThrow(expectedError)` - Error handling
- **Benefits**: Tests remain stable during implementation refactoring, focus on user-visible behavior

### QA

- Before any commit, run `pnpm tdd` and fix any warnings and errors

## Code Safety Guidelines

- Prefer function definition to prevent error conditions rather than checking at runtime
- Do not make checks at runtime for conditions which are impossible by the function definition

## Development Principles

- A task is only complete when build, typecheck, unit tests, and integration tests are all successful
- Use the supabase MCP to interact with the database

## Code Style and Best Practices

- Follow established code patterns and conventions within the platform
- Maintain consistent naming conventions across all features
- A maximum file size is around 500 lines

## Memory

- When asked to look at the database definition, look at `src/shared/types/database.ts`
- Never update the database.ts file. Always make changes via a database migration and then pull the types
- To update the database.ts file, run `pnpm run gen:db-types` from the project root
- If you create the same code more than twice, extract it into a shared function
- When you commit after bumping a version, tag with that version
- Do not deprecate; remove
- When you believe you have fixed a problem, run the test to confirm before continuing
- After making any database change, run gen:db-types from the project root to update database.ts
- Run integration tests with `pnpm test:integration` from the project directory
- Use supabase mcp for supabase commands except for gen:db-types to generate types into database.ts
- NEVER NEVER MANUALLY UPDATE DATABASE.TS

## Debugging Guidelines

### Problem-Solving Methodology

1. **Write a Failing Test First**: Always create a unit test that reproduces the exact problem before attempting any fixes

   - Unit tests should demonstrate the bug in isolation
   - Use proper mocking strategy: only mock external dependencies (like Supabase), never mock platform code
   - The test should fail for the right reason - demonstrating the actual bug

2. **Understand the Real Problem Space**:

   - **Unit vs Integration failures**: Different failure types indicate different root causes
   - **Mock vs Reality gaps**: Unit tests with mocks may pass while integration tests fail, indicating the mock doesn't reflect real behavior
   - **Integration-specific issues**: Real database constraints, shared state, timing issues, and external dependencies that unit tests can't detect

3. **Test Your Hypothesis with Real Evidence**:

   - When you think you've identified the root cause, test it against the actual failing scenario
   - If your fix works for unit tests but not integration tests, your hypothesis may be incomplete
   - Don't assume a fix works just because it seems logical - verify it against the failing test case

4. **Fix the Root Cause, Not Symptoms**:

   - Don't mask problems with workarounds (e.g., clearing caches manually between tests)
   - Ask "Why isn't the intended behavior working?" rather than "How can I make this pass?"
   - Example: If cache is polluted after sign-out, fix the sign-out cache invalidation, don't clear cache manually

5. **Verify the Fix Completely**:

   - **Unit tests**: Should pass after the fix
   - **Integration tests**: Should also pass without additional workarounds - this is the ultimate validation
   - **Both test types**: Should demonstrate the same correct behavior
   - **If integration tests still fail**: There may be additional root causes

6. **Test-Driven Development (TDD) Process**:

   - Red: Write a failing test that demonstrates the problem
   - Green: Fix the minimum code needed to make the test pass
   - Refactor: Clean up the implementation while keeping tests green

   Follow this when you are adding new features or fixing bugs. If a test case already reproduces the problem, you can skip the red step.

### Common Anti-Patterns to Avoid

- **Mocking platform code**: Never mock our own functions - only mock external dependencies
- **Hiding problems with cleanup**: Don't add manual cache clearing, database cleanup, or other workarounds that mask the real issue
- **Fixing symptoms instead of causes**: If something should work automatically but doesn't, fix the automation, don't work around it
- **Skipping the failing test step**: Always prove you can reproduce the problem in a test before fixing it
- **Writing tests that expect bugs**: Don't write assertions that expect broken behavior (e.g., `expect(cache).toEqual(oldData)` when cache should be cleared). Instead, write tests that expect correct behavior - they will fail and demonstrate the bug, then pass after the fix
- **Assuming mocked behavior matches real behavior**: Unit tests with mocks may pass while integration tests fail because mocks don't perfectly simulate real external dependencies
- **Stopping investigation after first hypothesis**: If your fix works for unit tests but integration tests still fail, there may be multiple root causes or your understanding is incomplete
- **Using console.log for debugging tests**: Tests should pass or fail clearly without requiring debug output to understand the problem

### Integration vs Unit Test Differences

- **Unit tests**: Mock external dependencies, test platform logic in isolation, create fresh test environment per test
- **Integration tests**: No mocking, test real end-to-end behavior with live database, validate real constraints and triggers
- **When integration tests fail but unit tests pass**: Look for environmental differences (shared state, different setup, real vs mocked dependencies)
  For detailed debugging examples, test patterns, and troubleshooting guidance, see the documentation files linked at the top of this document.
