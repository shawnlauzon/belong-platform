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

# Run tests with coverage
pnpm test:coverage

# Run tests in watch mode
pnpm test:watch
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

- Write comprehensive unit tests for all new functionality
- Test edge cases and error conditions
- Use the test file to guide and validate the implementation
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

- Before any commit, run `pnpm test` and fix any warnings and errors

## Code Safety Guidelines

- Prefer function definition to prevent error conditions rather than checking at runtime
- Do not make checks at runtime for conditions which are impossible by the function definition

## Development Principles

- A task is only complete when build, typecheck, unit tests, and integration tests are all successful
- Use the supabase MCP to interact with the database

## Database Change Workflow

**CRITICAL**: Database changes MUST follow this exact workflow to prevent production issues:

### Phase 1: Always Start by Syncing with Production

**NEVER make database changes without first syncing local with production**

```bash
# 1. Pull latest production schema
supabase db pull

# 2. Apply to local database  
supabase db reset
```

**If migration history conflicts occur:**
```bash
# Repair migration history as instructed by the error message
supabase migration repair --status reverted <migration-id>
supabase migration repair --status applied <migration-id>

# Then retry the pull
supabase db pull
supabase db reset
```

### Phase 2: Make Changes Locally ONLY

Choose one of these approaches:

**Option A: Direct SQL via Supabase Studio (Recommended for iteration)**
- Access Studio: `http://localhost:54323`
- Use SQL Editor for direct schema changes
- Perfect for rapid iteration and testing

**Option B: Migration File Approach**
```bash
supabase migration new <descriptive_name>
# Edit the created migration file with your SQL
```

**NEVER use `mcp__supabase__apply_migration` during development - this affects production!**

### Phase 3: Test Locally Until Perfect

```bash
# Apply your changes
supabase db reset

# Run ALL integration tests (not just the feature you're working on)
pnpm test:integration

# If tests fail:
# - Option A users: Modify SQL in Studio, then reset and test again
# - Option B users: Edit the migration file, then reset and test again
# Repeat until ALL tests pass
```

### Phase 4: Generate Production Migration (If Using Studio)

If you made changes via Studio instead of migration files:
```bash
supabase db diff -f <descriptive_name>
```

This creates a clean migration file based on your tested changes.

### Phase 5: Final Verification Before Production

```bash
# Final test run to ensure everything works
pnpm test:integration

# Review the migration file for any issues
# - No duplicate policies
# - No syntax errors  
# - Descriptive name and comments
```

### Phase 6: Push to Production (Only When Ready)

```bash
supabase db push
```

Or use MCP tool if CLI push fails, but prefer the CLI approach.

## Critical Rules

### ❌ What NOT to Do
- Create migrations without checking production first
- Apply untested migrations to production
- Create duplicate RLS policies or constraints
- Skip running integration tests before pushing
- Make direct changes to production during development
- Create multiple "fix" migrations for the same issue

### ✅ What TO Do  
- Always start by syncing with production
- Test changes locally with real integration tests
- Create one clean migration per logical change
- Use descriptive migration names
- Verify all tests pass before pushing to production

### Rollback Strategy

If something goes wrong in production:
1. **Don't panic** - Supabase tracks migration history
2. Create a rollback migration locally that undoes the changes
3. Test the rollback migration locally first
4. Apply the rollback to production
5. Investigate and fix the issue properly before re-attempting

### Example Workflow

```bash
# 1. Sync with production
supabase db pull && supabase db reset

# 2. Make changes in Studio (localhost:54323)
# ... modify schema, test manually ...

# 3. Test thoroughly  
supabase db reset && pnpm test:integration

# 4. Generate clean migration
supabase db diff -f "add_user_preferences_table"

# 5. Final verification
pnpm test:integration

# 6. Push to production
supabase db push
```

This workflow prevents the dangerous situation where local and production schemas diverge, causing migration conflicts and potential data issues.

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

1. **Understand the Problem**: Create a unit test that reproduces the exact problem to validate your understanding

   - Unit tests should demonstrate the bug in isolation
   - Use proper mocking strategy: only mock external dependencies (like Supabase), never mock platform code
   - The test should validate the expected behavior

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

6. **Development Process**:

   - Write tests to validate expected behavior
   - Implement the feature or fix
   - Ensure all tests pass
   - Refactor if needed while keeping tests green

### Common Anti-Patterns to Avoid

- **Mocking platform code**: Never mock our own functions - only mock external dependencies
- **Hiding problems with cleanup**: Don't add manual cache clearing, database cleanup, or other workarounds that mask the real issue
- **Fixing symptoms instead of causes**: If something should work automatically but doesn't, fix the automation, don't work around it
- **Not testing thoroughly**: Always ensure comprehensive test coverage for new functionality and bug fixes
- **Writing tests that expect bugs**: Don't write assertions that expect broken behavior (e.g., `expect(cache).toEqual(oldData)` when cache should be cleared). Instead, write tests that expect correct behavior - they will fail and demonstrate the bug, then pass after the fix
- **Assuming mocked behavior matches real behavior**: Unit tests with mocks may pass while integration tests fail because mocks don't perfectly simulate real external dependencies
- **Stopping investigation after first hypothesis**: If your fix works for unit tests but integration tests still fail, there may be multiple root causes or your understanding is incomplete
- **Using console.log for debugging tests**: Tests should pass or fail clearly without requiring debug output to understand the problem

### Integration vs Unit Test Differences

- **Unit tests**: Mock external dependencies, test platform logic in isolation, create fresh test environment per test
- **Integration tests**: No mocking, test real end-to-end behavior with live database, validate real constraints and triggers
- **When integration tests fail but unit tests pass**: Look for environmental differences (shared state, different setup, real vs mocked dependencies)
  For detailed debugging examples, test patterns, and troubleshooting guidance, see the documentation files linked at the top of this document.

- Use supabase MCP to connect to remote database and supabase-local MCP to connect to local database. All development is done against local database