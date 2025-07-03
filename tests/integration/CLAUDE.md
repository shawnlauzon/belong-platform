# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important

- As a QA engineer testing the package, NEVER update files in the src directory
- ONLY modify test files and test infrastructure in the tests/integration directory
- Focus on maintaining and improving test quality, not implementing new platform features

## Integration Test Commands

```bash
# Run all integration tests
pnpm test:integration

# Run integration tests in watch mode
pnpm test:integration:watch

# Cleanup database after tests (if needed)
pnpm test:integration:cleanup

# Verbose test output with console.log statements
VITEST_VERBOSE=true pnpm test:integration

# Complete QA workflow (run unit tests first, then integration)
pnpm test:complete
```

## Test Architecture

### Core Testing Infrastructure

The integration test suite is built around these key components:

- **Sequential Test Execution**: All integration tests run sequentially (`singleFork: true`) to avoid database conflicts
- **Database Isolation**: Each test gets clean database state through automated cleanup patterns
- **React Query Wrapper**: Specialized test wrapper that disables caching and retries for predictable test behavior
- **Test Data Factory**: Generates consistent test data with unique identifiers for cleanup
- **Environment Setup**: Validates required environment variables and configures global test state

### Test Structure

```
tests/integration/
├── setup/
│   ├── test-environment.ts      # Global test setup and environment validation
│   └── database-setup.ts        # Database configuration and test helpers
├── helpers/
│   ├── test-data-factory.ts     # Generate test data with cleanup patterns
│   ├── cleanup-patterns.ts      # Database and cache cleanup utilities
│   ├── react-query-wrapper.ts   # Test-optimized React Query configuration
│   ├── auth-helpers.ts          # Authentication utilities for tests
│   └── test-utilities.ts        # Common test utilities and assertions
├── auth/                        # Authentication integration tests
├── communities/                 # Community management tests
├── conversations/               # Messaging system tests
├── resources/                   # Resource sharing tests
└── scripts/
    └── cleanup-database.js      # Manual database cleanup script
```

### Key Testing Patterns

**Test Data Generation**

- All test data uses `TestDataFactory` with prefixed names (e.g., `INTEGRATION_TEST_RESOURCE_123`)
- Unique identifiers include timestamps and random strings for conflict avoidance
- Test data is automatically identifiable for cleanup

**Database Cleanup Strategy**

- Automatic cleanup runs before and after each test
- Global cleanup runs after all tests in a file complete
- Cleanup targets test data by name patterns, preserving non-test data
- Fallback cleanup strategies handle partial cleanup failures

**React Query Configuration**

- Zero cache time and stale time for fresh data in each test
- Disabled retries and window focus refetching
- Silent logging to reduce test noise
- Fresh query client instance for each test file

## Environment Setup

Required environment variables (checked at test startup):

```bash
# Required for integration tests
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_MAPBOX_PUBLIC_TOKEN=your-mapbox-token
```

Create `.env.local` file in the project root with these values.

## Test Writing Guidelines

### Test Data Management

- Always use `TestDataFactory` for generating test data
- Use descriptive test names that include the feature being tested
- Ensure test data has unique identifiers to avoid conflicts
- Let cleanup helpers handle data removal automatically

### Database Testing

- Tests run against real Supabase database, not mocks
- Each test gets isolated database state through cleanup patterns
- Use `testWrapperManager.getWrapper()` for React Query provider
- Authentication state is managed through `auth-helpers.ts`

### Test Isolation

- Tests run sequentially to prevent database race conditions
- Fresh React Query client for each test prevents cache pollution
- Local storage and session storage cleared between tests
- Database cleanup ensures no test data persists between runs

### Common Test Utilities

Import commonly used testing utilities from the helpers:

```typescript
import {
  renderHook,
  act,
  waitFor,
  describe,
  test,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  faker,
} from "../helpers";
```

## Test Execution Configuration

- **Timeout**: 30 seconds for both tests and hooks (integration tests may be slower)
- **Environment**: jsdom for React component testing
- **Sequential Execution**: Single fork prevents database conflicts
- **Silent Mode**: Disabled by default, use `VITEST_VERBOSE=true` for detailed output

## Debugging Integration Tests

### Verbose Logging

```bash
VITEST_VERBOSE=true pnpm test:integration
```

### Database State Inspection

- Integration tests use real database data
- Check Supabase dashboard for data state during debugging
- Use test data prefixes to identify test-generated records

### Cache and State Issues

- React Query cache is cleared between tests automatically
- Local/session storage cleared in test setup
- Use `testWrapperManager.reset()` for complete state reset

## Platform Testing Focus

As QA engineers, focus testing on:

- **API Integration**: Verify hooks work with real Supabase backend
- **Data Flow**: Ensure data flows correctly through React Query layer
- **Authentication**: Test sign-in/sign-out and user state management
- **Cross-Feature Integration**: Verify features work together (e.g., resources + communities)
- **Error Handling**: Test failure scenarios and error states
- **Performance**: Ensure queries and mutations perform adequately

## Cleanup and Maintenance

### Manual Database Cleanup

```bash
# If automated cleanup fails
pnpm test:integration:cleanup
```

### Test Data Patterns

- All test data includes `INTEGRATION_TEST_` or similar prefixes
- Use `TestDataFactory.isTestResource()` etc. to identify test data
- Cleanup helpers target these patterns for removal

## Important Constraints

- **NO src/ directory modifications**: Tests only, never modify platform source code
- **Database safety**: Cleanup patterns prevent test data from polluting production schemas
- **Sequential execution**: Required for database consistency, don't change to parallel
- **Real dependencies**: Integration tests use actual Supabase and external services
