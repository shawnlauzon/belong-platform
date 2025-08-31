# Integration Testing Guide

## Quick Reference

### Running Tests

```bash
# All integration tests
pnpm test:integration

# With debug logs (shows console.log output)
VITEST_VERBOSE=true pnpm test:integration

# Specific test file
pnpm test:integration tests/integration/communities/communities-crud.test.ts
```

## Understanding Test Output

### ✅ Expected Errors (NOT failures)

These appear in **stderr** but are **correct behavior**:

```
❌ ERROR: invalid input syntax for type uuid: "invalid-user-id"
❌ ERROR: duplicate key value violates unique constraint
```

These are negative test cases verifying proper error handling.

### ❌ Actual Test Failures

Only actual failures of the test suite should be considered failures.

## Debugging Methodology

### 1. Classify the Issue

- **Test Failure**: Bug in test logic/expectations
- **Code Failure**: Bug in application code
- **Environment Issue**: Database/setup problems

### 2. Investigation Process

1. **Write Failing Test First**: Reproduce issue in isolation
2. **Check Real vs Mocked Behavior**: Integration tests reveal gaps unit tests miss
3. **Verify Database State**: Query database directly to confirm data: use supabase-local MCP
4. **Test Hypothesis**: Make minimal changes and re-run tests

### 3. Critical Anti-Patterns - NEVER DO THESE

- ❌ Modifying test expectations to match broken behavior
- ❌ Adding workarounds to make tests pass
- ❌ Commenting out failing assertions
- ❌ Skipping tests instead of fixing underlying issues

## Creating Tests

### Important Guidelines

- **Validate one thing per test**: Avoid validating sequences of actions in a single test
- **Test simple things first**: The first tests in a suite should be simple, then build up to more complex tests
- **Always use `createFake*` utilities** from test-utils
- **Include `test_int_` prefix** for identification
- **Clean up** in afterAll hooks
- **Data created in beforeAll is read-only**; create writable data in tests
- **Use describe blocks to group related mutation tests into scopes with their own beforeAll/beforeEach**
- **Use beforeEach/afterEach when tests actually mutate shared data.** If tests just read or create their own data, let each test create what it needs.
- **Similarly, rather than copying and pasting the same setup code, do it once in setupAll / setupEach**
- **Create one test at a time**: After writing it, run it to confirm it works, and then write another
- **Do not attempt to test 'edge cases'**: Focus on validation of real life issues
- **Avoid manually inserting data into the database**; use the provided test utilities instead unless you needed to test a specific case

### Essential Test Structure

```typescript
describe('Feature - Operation Group', () => {
  let supabase: SupabaseClient<Database>;
  let testUser: User;
  let testCommunity: Community;

  beforeAll(async () => {
    supabase = createTestClient();

    // Creating a user automatically signs them in
    testUser = await createTestUser(supabase);

    // Creating a community automatically adds logged as a member
    testCommunity = await createTestCommunity(supabase);
  });

  afterAll(async () => {
    await cleanupAllTestData(supabase);
  });

  it('describes expected behavior', async () => {
    // Arrange
    const testData = createFakeData();

    // Act
    const result = await api.operation(supabase, testData);

    // Assert
    expect(result).toMatchObject({
      oneField: oneValue,
      anotherField: anotherValue,
      ...
    });
  });
});
```

### Best practices

- Integration tests should validate database interactions, not pure logic. If a test can be written as a unit test without database setup, it should be a unit test instead.
- Ask yourself: What database behavior am I testing? If the answer is 'none' or 'just that it returns something,' the test probably belongs in unit tests or needs to be rewritten to test actual database integration.
- When verifying data, prefer using `toMatchObject` over many individual assertions
- Make sure `expect.any`types are compatible with the type you're testing
- **Run a single test first** - Before making broad changes, run a single test to confirm it works as expected
- **Creating a user automatically signs it in**; only call signIn to sign in a different user

## Error Testing Pattern

```typescript
// Test expected errors
it('fails with invalid input', async () => {
  // Do not validate error messages or error codes
  await expect(api.operation(supabase, invalidData)).rejects.toThrow();
});
```

## Key Principles

- **Integration tests expose bugs, not hide them** - failing tests indicate real problems
- **Test real database interactions** - no mocking of external dependencies
- **Use comprehensive cleanup** - prevent test pollution
- **Focus on end-to-end behavior** - verify complete workflows work

---

## Adding Feature-Specific Guidance

_This section reserved for feature-specific testing patterns as needed_

## Common Issues & Solutions

_This section reserved for specific troubleshooting guidance as patterns emerge_
