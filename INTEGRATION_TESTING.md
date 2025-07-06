# Integration Testing Guide

## Overview

Integration tests validate end-to-end functionality of the Belong Network platform by testing real interactions with the Supabase database. Unlike unit tests that mock external dependencies, integration tests verify that all components work together correctly in a realistic environment.

## Purpose

- **Validate Real Database Operations**: Test actual SQL queries, constraints, and triggers
- **Verify Business Logic**: Ensure complex workflows function correctly across multiple components
- **Catch Integration Issues**: Identify problems that unit tests might miss due to mocking
- **Validate API Contracts**: Confirm that services return expected data structures and handle errors properly

## Architecture

### Directory Structure

```
tests/integration/
├── communities/
│   ├── communities-crud.test.ts       # CRUD operations
│   └── communities-membership.test.ts  # Membership operations
├── helpers/
│   ├── cleanup.ts                     # Test data cleanup utilities
│   ├── test-client.ts                 # Supabase client factory
│   └── test-data.ts                   # Test data creation helpers
├── setup.ts                           # Test environment setup
└── vitest.config.ts                   # Test configuration
```

### Test Client Setup

- Uses Supabase service key for elevated permissions
- Disables auth session persistence for test isolation
- Configures 30-second timeouts for database operations

### Test Data Management

- **Identification**: All test data uses `test_int_` prefix
- **Isolation**: Each test creates/cleans its own data
- **Cleanup**: Comprehensive cleanup in `afterAll` hooks using prefix matching

## Running Tests

### Commands

```bash
# Run all integration tests
pnpm test:integration

# Run with verbose logging (shows console.log statements)
VITEST_VERBOSE=true pnpm test:integration

# Run specific test file
pnpm test:integration tests/integration/communities/communities-crud.test.ts
```

### Environment Setup

1. Copy `.env.test.example` to `.env.test.local`
2. Configure required environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY`

## Test Output Interpretation

### Expected vs Unexpected Failures

#### ✅ Expected Error Messages (Not Failures)

These appear in **stderr** but are **correct behavior**:

```
❌ ERROR: invalid input syntax for type uuid: "invalid-user-id"
❌ ERROR: duplicate key value violates unique constraint
```

These are negative test cases verifying proper error handling.

#### ❌ Actual Test Failures

These appear as **assertion failures**:

```
AssertionError: expected 0 to be greater than 0
AssertionError: expected [ {...} ] to have a length of +0 but got 1
```

These indicate bugs in the application code.

### Debug Logs

Tests output structured debug information:

```
🐛 DEBUG: Creating community { name: 'test_int_Community_123' }
ℹ️ INFO: Successfully signed up { userId: 'abc-123' }
❌ ERROR: Failed to create community { error: {...} }
```

## Debugging Methodology

### 1. Classify the Failure

- **Test Failure**: Bug in test logic or expectations
- **Code Failure**: Bug in application code
- **Environment Issue**: Database connectivity, permissions, or setup

### 2. Analyze Error Context

- Check if error appears in stderr (expected) vs assertion failure (unexpected)
- Review debug logs to understand the execution flow
- Identify where the expected vs actual behavior diverges

### 3. Investigation Steps

1. **Write Failing Test First**: Reproduce the exact issue in isolation
2. **Check Real vs Mocked Behavior**: Integration tests reveal gaps unit tests miss
3. **Verify Database State**: Query database directly to confirm expected data
4. **Test Hypothesis**: Make minimal code changes and re-run tests

### 4. Common Anti-Patterns to Avoid

- ❌ Modifying test expectations to match broken behavior
- ❌ Adding workarounds to make tests pass
- ❌ Commenting out failing assertions
- ❌ Skipping tests instead of fixing underlying issues

## Best Practices

### Test Structure

```typescript
describe('Feature - Operation Group', () => {
  let supabase: SupabaseClient<Database>;
  let testResources: TestResources;

  beforeAll(async () => {
    supabase = createTestClient();
    await cleanupAllTestData(supabase);
    testResources = await createSharedResources(supabase);
  });

  afterAll(async () => {
    await cleanupAllTestData(supabase);
  });

  describe('specificOperation', () => {
    it('describes expected behavior', async () => {
      // Arrange
      const testData = createTestData();

      try {
        // Act
        const result = await api.operation(supabase, testData);

        // Assert
        expect(result).toBe(expectedValue);
      } finally {
        // Cleanup (if needed for this specific test)
        await cleanupTestData(supabase, testData);
      }
    });
  });
});
```

### Test Data Creation

- Use `createFake*` functions from test utilities
- Include `TEST_PREFIX` in all generated names
- Create unique identifiers using `Date.now()` for test isolation

### Cleanup Patterns

- **Comprehensive**: Use `cleanupAllTestData()` in beforeAll/afterAll
- **Targeted**: Use specific cleanup functions for individual test isolation
- **Defensive**: Always cleanup in try/finally blocks

### Error Testing

```typescript
// Test expected errors
it('fails with invalid input', async () => {
  await expect(api.operation(supabase, invalidData)).rejects.toThrow();
});

// Test error messages (optional)
it('provides helpful error message', async () => {
  await expect(api.operation(supabase, invalidData)).rejects.toThrow(
    'Expected error message',
  );
});
```

## Adding New Tests

### 1. Choose Appropriate File

- **CRUD operations**: Add to existing or create new `*-crud.test.ts`
- **Complex workflows**: Create new feature-specific test file
- **Cross-feature scenarios**: Consider separate integration test file

### 2. Follow Naming Conventions

- File: `feature-category.test.ts`
- Test suites: `'Feature API - Category'`
- Tests: `'describes the expected behavior'`

### 3. Test Data Guidelines

- Always use test data factories (`createFake*`)
- Include `TEST_PREFIX` for identification
- Create minimal data needed for the test
- Clean up test-specific resources

### 4. Database Interactions

- Use real Supabase client, no mocking
- Test both success and error scenarios
- Verify database state changes when relevant
- Consider cascade effects and constraints

## Future Improvements

### Test Coverage Expansion

- Add integration tests for remaining features (events, resources, conversations)
- Test complex multi-feature workflows
- Add performance and load testing scenarios

### Infrastructure Enhancements

- Implement test database snapshots for faster test runs
- Add parallel test execution with proper isolation
- Create shared test fixtures for common scenarios

### Quality Improvements

- Add integration test metrics and reporting
- Implement test data generation at scale
- Add visual test result reporting

## Troubleshooting

### Common Issues

#### "Missing required env var"

- Ensure `.env.test.local` is properly configured
- Verify Supabase credentials are valid

#### "Connection refused"

- Check Supabase URL and network connectivity
- Verify service key has proper permissions

#### "Test timeout"

- Database operations taking too long
- Check for hanging transactions or deadlocks
- Consider increasing timeout in vitest.config.ts

#### "Data pollution between tests"

- Ensure proper cleanup in afterAll hooks
- Check TEST_PREFIX usage in all test data
- Verify cleanup functions are comprehensive

### Getting Help

- Review test output logs for detailed error information
- Check database state directly using Supabase dashboard
- Compare working vs failing test patterns
- Ensure all prerequisites in CLAUDE.md are met

---

**Remember**: Integration tests should expose bugs, not hide them. A failing test is valuable information about system problems that need to be addressed in the application code.
