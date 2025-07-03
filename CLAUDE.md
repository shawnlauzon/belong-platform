This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Important

- ALL instructions within this document MUST BE FOLLOWED, these are not optional unless explicitly stated.
- DO NOT edit more code than you have to.
- DO NOT WASTE TOKENS, be succinct and concise.

## Development Commands

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

# Pre-commit verification (lint, typecheck, tests, and clean build)
pnpm lint && pnpm typecheck && pnpm test && pnpm build

# Run integration tests
pnpm test:integration
```

Architecture Overview

Belong Network is a TypeScript monorepo for a hyper-local community platform built with React Query and
Supabase.

Package Structure

- @belongnetwork/platform - Data layer with React Query hooks for auth, communities, resources, and users
- @belongnetwork/components - Reusable UI components built with Radix UI and Tailwind CSS
- @belongnetwork/core - Shared configuration, utilities, and logger
- @belongnetwork/types - TypeScript type definitions and database schema types

Tech Stack

- Frontend: React 18, TypeScript, TanStack Query for data fetching
- UI: Tailwind CSS, Radix UI primitives
- Database: Supabase (PostgreSQL + PostGIS for spatial data)
- Build: Vite with pnpm workspaces
- Testing: Vitest with jsdom and Testing Library

Development Guidelines

Code Patterns

- Study existing files for established patterns before creating new ones
- Follow component composition patterns established in @belongnetwork/components

Type Safety

- NEVER use any types - always create proper interfaces, union types, or use type assertions
- All functions and components must have explicit type annotations
- Use generated database types from @belongnetwork/types
- Prefer type-safe patterns over casting or type assertions

TDD

- Always write a test before writing the code
- Use the test file to guide the implementation

Testing

- Each package has its own Vitest configuration
- Skipping tests is not an acceptable way to make tests pass
- A problem must fail the test; logging errors is only for debugging
- **ALWAYS use createMock\* utilities from @belongnetwork/platform/src/test-utils for generating test data**
- Use faker to generate data for tests and to document expected values

- Unit tests are located in the **tests** directory of the feature
- Integration tests are located in the tests/integration directory

QA

- Before any commit, run `pnpm tdd` and fix any warnings and errors

Publish

- Before publishing, run `pnpm qa` and fix any warnings and errors, then bump the patch version in all package.json files, then commit, then tag, then publish

Code Safety Guidelines

- Prefer function definition to prevent error conditions rather than checking at runtime. Do not make checks at runtime for conditions which are impossible by the function definition.

Development Principles

- A task is only complete when build and typecheck and tests are all successful
- Use the supabase MCP to interact with the database

## Code Style and Best Practices

- Follow established code patterns and conventions within each package
- Maintain consistent naming conventions across the monorepo
- A maximum file size is around 500 lines

## Memory

- When asked to look at the database definition, either look at database.t
- Never update the database.ts file. Always make changes via a database migration and then pull the types
- To update the database.ts file, run `pnpm run gen:db-types` from the types directory
- If you create the same code more than twice, extract it into a shared function
- Keep versions of all packages aligned
- When you commit after bumping a version, tag with that version
- Do not deprecate; remove
- When you believe you have fixed a problem, run the test to confirm before continuing
- After making any database change, run gen:db-types from the types package to update database.ts
- Run integration tests with `pnpm test:integration` from the project directory
- Use supabase mcp for supabase commands except for gen:db-types to generate types into database.ts

## Debugging Guidelines

### Problem-Solving Methodology

1. **Write a Failing Test First**: Always create a unit test that reproduces the exact problem before attempting any fixes

   - Unit tests should demonstrate the bug in isolation
   - Use proper mocking strategy: only mock external dependencies (like Supabase), never mock platform code
   - The test should fail for the right reason - demonstrating the actual bug

2. **Understand the Real Problem Space**:

   - Distinguish between unit test failures and integration test failures - they may have different root causes
   - Unit tests with mocks may pass while integration tests fail, indicating the mock doesn't reflect real behavior
   - Integration test failures may reveal environmental issues (shared state, timing, real external dependencies) that unit tests can't detect

3. **Test Your Hypothesis with Real Evidence**:

   - When you think you've identified the root cause, test it against the actual failing scenario
   - If your fix works for unit tests but not integration tests, your hypothesis may be incomplete
   - Don't assume a fix works just because it seems logical - verify it against the failing test case

4. **Fix the Root Cause, Not Symptoms**:

   - Don't mask problems with workarounds (e.g., clearing caches manually between tests)
   - Ask "Why isn't the intended behavior working?" rather than "How can I make this pass?"
   - Example: If cache is polluted after sign-out, fix the sign-out cache invalidation, don't clear cache manually

5. **Verify the Fix Completely**:

   - The unit test should pass after the fix
   - Integration tests should also pass without additional workarounds
   - Both test types should demonstrate the same correct behavior
   - If integration tests still fail after unit tests pass, there may be additional root causes

6. **Test-Driven Development (TDD) Process**:

   - Red: Write a failing test that demonstrates the problem
   - Green: Fix the minimum code needed to make the test pass
   - Refactor: Clean up the implementation while keeping tests green

7. **MANDATORY: Unit Test Before Implementation**:
   - **ALWAYS write a failing unit test first** before implementing any bug fix or feature
   - The test must reproduce the exact error or behavior described in the bug report
   - Use the test to validate your understanding of the problem
   - Only after the test fails for the right reason should you implement the fix
   - Verify the test passes after implementation
   - Example: For authentication bug, create unit test that calls the failing service method and expects the specific error message

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
- **Integration tests**: No mocking, test real end-to-end behavior, may share some state between tests
- **When integration tests fail but unit tests pass**: Look for environmental differences (shared state, different setup, real vs mocked dependencies)

### Key Lessons from Real Debugging Sessions

1. **Cache Pollution Investigation Example**:

   - **Initial Hypothesis**: Cache not being invalidated when using useSignOut hook
   - **Reality**: Integration test was calling `supabase.auth.signOut()` directly, bypassing our hooks entirely
   - **First Fix Attempt**: Added auth state listener to automatically clear cache on SIGNED_OUT events
   - **Result**: Unit tests still fail because mocks don't trigger real auth state changes; integration tests still fail indicating additional root causes
   - **Lesson**: Multiple layers of the problem needed investigation - direct Supabase calls AND potentially other cache pollution sources

2. **Mock vs Reality Gap**:

   - **Problem**: Unit test with perfect mocks can pass while integration test with real Supabase fails
   - **Insight**: Mocks capture our understanding of how external dependencies work, but may miss edge cases, timing issues, or state persistence that real dependencies exhibit
   - **Solution**: When unit and integration tests diverge, investigate what real behavior the mocks are missing

3. **Shared State in Integration Tests**:
   - **Problem**: Integration tests getting user data from previous test runs instead of current test
   - **Insight**: Integration tests may share QueryClient instances, database state, or browser storage between tests
   - **Investigation Strategy**: Look for differences in test setup (beforeEach vs beforeAll, fresh vs shared instances)
