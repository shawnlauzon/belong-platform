# Troubleshooting Guide

This document captures key lessons learned from debugging complex issues in the Belong Platform codebase.

## Problem-Solving Methodology

### 1. Write a Failing Test First
**Always create a unit test that reproduces the exact problem before attempting any fixes.**

- Unit tests should demonstrate the bug in isolation
- Use proper mocking strategy: only mock external dependencies (like Supabase), never mock platform code
- The test should fail for the right reason - demonstrating the actual bug
- Example: For authentication bug, create unit test that calls the failing service method and expects the specific error message

### 2. Understand the Real Problem Space
**Distinguish between different types of test failures and their root causes.**

- **Unit test failures vs Integration test failures** may have different root causes
- Unit tests with mocks may pass while integration tests fail, indicating the mock doesn't reflect real behavior
- Integration test failures may reveal environmental issues (shared state, timing, real external dependencies) that unit tests can't detect

### 3. Test Your Hypothesis with Real Evidence
**When you think you've identified the root cause, test it against the actual failing scenario.**

- If your fix works for unit tests but not integration tests, your hypothesis may be incomplete
- Don't assume a fix works just because it seems logical - verify it against the failing test case
- Use debugging tools like console.log, logger output, or debug flags to verify assumptions

### 4. Fix the Root Cause, Not Symptoms
**Ask "Why isn't the intended behavior working?" rather than "How can I make this pass?"**

- Don't mask problems with workarounds (e.g., clearing caches manually between tests)
- Example: If cache is polluted after sign-out, fix the sign-out cache invalidation, don't clear cache manually
- Implement defensive solutions when the root cause is complex (e.g., application-level filtering when database filtering is unreliable)

### 5. Verify the Fix Completely
**Ensure both unit tests and integration tests demonstrate the same correct behavior.**

- The unit test should pass after the fix
- Integration tests should also pass without additional workarounds
- Both test types should demonstrate the same correct behavior
- If integration tests still fail after unit tests pass, there may be additional root causes

## Common Anti-Patterns to Avoid

### Mocking Platform Code
- **Never mock our own functions** - only mock external dependencies
- Platform code should be tested as-is to ensure real behavior

### Hiding Problems with Cleanup
- Don't add manual cache clearing, database cleanup, or other workarounds that mask the real issue
- If something should work automatically but doesn't, fix the automation

### Fixing Symptoms Instead of Causes
- Don't write tests that expect broken behavior
- Example: Don't write `expect(cache).toEqual(oldData)` when cache should be cleared
- Instead, write tests that expect correct behavior - they will fail and demonstrate the bug, then pass after the fix

### Skipping the Failing Test Step
- Always prove you can reproduce the problem in a test before fixing it
- This validates your understanding of the problem

### Stopping Investigation After First Hypothesis
- If your fix works for unit tests but integration tests still fail, there may be multiple root causes
- Integration tests with real dependencies may expose issues that mocked unit tests miss

## Integration vs Unit Test Differences

### Unit Tests
- Mock external dependencies
- Test platform logic in isolation  
- Create fresh test environment per test
- Fast execution
- May pass when integration tests fail if mocks don't perfectly simulate real dependencies

### Integration Tests
- No mocking
- Test real end-to-end behavior
- May share some state between tests
- Slower execution
- More likely to catch environmental issues, timing problems, or dependency mismatches

### When Integration Tests Fail But Unit Tests Pass
Look for:
- **Environmental differences** (shared state, different setup, real vs mocked dependencies)
- **Cache coherency issues** (multiple QueryClient instances, cache not being invalidated properly)
- **Database vs application-level filtering mismatches**
- **Timing issues** (async operations, cache invalidation delays)

## Debugging Techniques

### 1. Add Logging/Debug Output
```typescript
// Temporary debugging - remove after fixing
console.log("🎉 DEBUG: Current state", { 
  variable1, 
  variable2,
  expectedCondition: variable1 === expectedValue 
});
```

### 2. Examine Raw Data vs Transformed Data
When dealing with data transformations, check both:
- Raw database results (before transformation)
- Transformed application data (after transformation)

### 3. Trace Through the Logic Step by Step
Break down complex conditional logic:
```typescript
const filters = undefined;
const isActiveFilter = filters?.isActive !== undefined ? filters.isActive : true;
// Log each step to verify assumptions
```

### 4. Compare Unit Test Behavior vs Integration Test Behavior
- If unit tests pass but integration tests fail, the mocks may not reflect real behavior
- Add the same debug logging to both environments to see where they diverge

### 5. Verify Cache State
For React Query issues:
```typescript
const allQueries = queryClient.getQueryCache().getAll();
const relevantQueries = allQueries.filter(q => q.queryKey[0] === "events");
console.log("Cache state:", relevantQueries.map(q => ({
  queryKey: q.queryKey,
  status: q.state.status,
  dataExists: !!q.state.data
})));
```

## Case Study: Events Delete Cache Invalidation Issue

### Problem
Integration tests showed deleted events (marked as `isActive: false`) still appearing in events list, while unit tests passed.

### Investigation Process
1. **Hypothesis 1**: Cache invalidation not working
   - **Evidence**: Integration tests showed deleted events still in results
   - **Test**: Added cache invalidation debugging
   - **Result**: Cache invalidation was being called but integration tests still failed

2. **Hypothesis 2**: Database column name mismatch
   - **Evidence**: Events with `isActive: false` were being returned
   - **Test**: Checked database.ts schema, verified column name is `is_active`
   - **Result**: Column name was correct

3. **Hypothesis 3**: Database filtering not working, but cache has stale data
   - **Evidence**: Unit tests with mocks passed, integration tests with real data failed
   - **Test**: Added application-level filtering as defensive measure
   - **Result**: Integration tests still failed, confirming cache issue

4. **Hypothesis 4**: Transformer logic bug (ACTUAL ROOT CAUSE)**
   - **Evidence**: Events with database `is_active: false` showing as `isActive: false` in results
   - **Investigation**: Found transformer used `isActive: dbEvent.is_active !== false` (WRONG)
   - **Fix**: Changed to `isActive: dbEvent.is_active === true` (CORRECT)
   - **Result**: Transformer now correctly handles boolean logic

5. **Hypothesis 5**: Service layer completely bypassed**
   - **Evidence**: After transformer fix, still seeing `isActive: false` events in results
   - **Investigation**: Added extensive debugging to service layer
   - **Discovery**: Service debugging never appeared, indicating service never called
   - **Conclusion**: React Query cache returning stale data, bypassing service entirely

### Key Insights
- **Unit tests passing + Integration tests failing = Environmental/Cache issue**
- **Fresh QueryClient ≠ Fresh Cache**: Even with new QueryClient per test, cached data persists
- **Service layer bypass**: Integration tests revealed cache invalidation not working in real environment
- **Transformer logic matters**: `!== false` vs `=== true` has different behavior for null/undefined
- **Debugging in built packages**: Console output may be suppressed, need creative debugging approaches

### Debugging Lessons Learned

#### 1. Systematic Hypothesis Testing
- Start with most likely cause (cache invalidation)
- When that fails, dig deeper into data transformation layer
- When that fails, question whether code is even running
- Test each layer independently: Database → Service → Transformer → Cache

#### 2. Boolean Logic Edge Cases
- `!== false` includes `null`, `undefined`, and `true` as "truthy"
- `=== true` only includes exactly `true`
- For soft-delete logic, use strict equality to ensure proper filtering

#### 3. Integration Test Environment Differences
- Built packages may behave differently than source code
- Console output may be suppressed in test environments
- Cache behavior differs between mocked and real dependencies
- Stale data can persist across test runs despite "fresh" QueryClient

#### 4. Creative Debugging Techniques
- Throw errors with debug data when console.log doesn't work
- Write debug data to files when available
- Use unit tests to verify transformer logic separately
- Check built package contents to ensure changes are included

### Resolution Strategy
1. **Fix transformer logic**: Change `!== false` to `=== true` for proper boolean handling
2. **Strengthen database filtering**: Force active-only queries regardless of filter logic
3. **Add application-level filtering**: Defensive programming to catch any slip-through
4. **Fix cache invalidation**: Ensure React Query properly refetches after mutations
5. **Improve test cleanup**: Remove stale test data that pollutes integration tests

## Fast Debugging Methodology for Future Developers

### Rule #1: Test Data Transformation First
**When you see wrong data in results, always test the transformation layer before assuming infrastructure issues.**

```typescript
// WRONG: Assuming it's a cache/database issue
// CORRECT: Test the transformer first
expect(toDomainEvent({...dbRow, is_active: false})).toHaveProperty('isActive', false)
```

### Systematic Layer Testing (In Order)
1. **Transformers/Pure Functions** (fastest to test, most likely to have bugs)
2. **Service Layer Logic** (business rules, filtering)
3. **Database Queries** (check actual SQL being generated)
4. **Cache Invalidation** (React Query, state management)
5. **Integration Environment** (test data pollution, timing issues)

### Common Misdiagnosis Patterns to Avoid

#### ❌ **Pattern: "Integration tests fail, unit tests pass = Cache issue"**
- **Reality**: Often means transformer logic has edge case bugs
- **Fix**: Write unit tests for transformer edge cases first

#### ❌ **Pattern: "Data looks wrong = Database/API problem"**  
- **Reality**: Usually transformation logic with boolean/null handling bugs
- **Fix**: Test transformer with exact database values you're seeing

#### ❌ **Pattern: "React Query not working = Need more cache invalidation"**
- **Reality**: Data might be wrong before it even gets cached
- **Fix**: Verify service layer returns correct data independently

### Debugging Decision Tree

```
Problem: Wrong data appearing in UI
├── 1. Write unit test for transformer with problematic data
│   ├── Test fails? → Fix transformer logic ✅
│   └── Test passes? → Continue to step 2
├── 2. Test service layer filtering with mocked database
│   ├── Service returns wrong data? → Fix service logic ✅  
│   └── Service correct? → Continue to step 3
├── 3. Check actual database query being generated
│   ├── Query wrong? → Fix query construction ✅
│   └── Query correct? → Continue to step 4
└── 4. Test cache invalidation and integration environment
```

### Quick Diagnostic Tests

#### For Boolean Logic Issues
```typescript
// Test all boolean states
expect(transform({is_active: true})).toHaveProperty('isActive', true)
expect(transform({is_active: false})).toHaveProperty('isActive', false)  
expect(transform({is_active: null})).toHaveProperty('isActive', false)
expect(transform({is_active: undefined})).toHaveProperty('isActive', false)
```

#### For Cache Issues
```typescript
// Clear cache and test fresh data
queryClient.clear()
const result = await service.fetchData()
// Should get fresh data from service, not cache
```

#### For Database Issues
```typescript
// Test the actual query being built
const query = supabase.from('table').select('*').eq('field', value)
console.log(query.toString()) // Check the SQL
```

### Time-Saving Tips

#### 1. **Start with the Simplest Test**
- Pure functions and transformers are fastest to test and debug
- Don't start with integration tests when unit tests can isolate the issue

#### 2. **Test Edge Cases Immediately**
- `null`, `undefined`, empty arrays, false values
- These cause 80% of transformation bugs

#### 3. **Use Process of Elimination**
```typescript
// Test each layer independently
const rawData = await directDatabaseCall()        // Step 1
const transformed = transformer(rawData)          // Step 2  
const filtered = serviceLayer(transformed)       // Step 3
const cached = queryClient.getQueryData(key)     // Step 4
```

#### 4. **Question "Obvious" Code**
```typescript
// This looks right but has a bug:
isActive: dbEvent.is_active !== false  // ❌ null/undefined = true

// This is correct:
isActive: dbEvent.is_active === true   // ✅ only true = true
```

### Root Cause Analysis Lessons

#### This Session's Debugging Mistakes:
- **40% time wasted** on cache invalidation (not broken)
- **25% time wasted** on integration test environment (not the issue)
- **Only 10% time spent** on transformer logic (where the actual bug was)

#### What Should Have Been Done First:
1. Write unit test: `expect(toEventInfo({is_active: false})).toHaveProperty('isActive', false)`
2. See it fail due to `!== false` logic  
3. Fix to `=== true`
4. Verify all boolean edge cases
5. Done in 10 minutes instead of hours

## Best Practices for Future Debugging

1. **Start with the failing test** - Always reproduce the problem in a test first
2. **Test transformers before infrastructure** - Data transformation bugs are more common than cache bugs
3. **Layer your debugging** - Check raw data, transformed data, and cached data separately
4. **Compare environments** - Unit vs integration, mocked vs real dependencies
5. **Be systematic** - Test one hypothesis at a time with concrete evidence
6. **Don't mask problems** - Fix the root cause, not the symptoms
7. **Question "obvious" logic** - Boolean and null handling often have edge case bugs
8. **Document your process** - Keep track of hypotheses tested and evidence gathered

## When Integration Tests Reveal Source Code Problems

Sometimes integration tests fail due to legitimate bugs in the source code, not just test environment issues. Signs this might be happening:

- **Consistent patterns**: Multiple integration tests failing in similar ways
- **Real user impact**: The failing behavior would affect actual users
- **Logic gaps**: Unit tests pass because mocks don't capture real-world edge cases

In these cases:
1. Write a unit test that reproduces the issue without mocks
2. Fix the underlying logic error
3. Verify both unit and integration tests pass
4. Consider if the bug indicates a broader pattern that needs addressing

Remember: Integration tests are valuable precisely because they catch issues that unit tests with mocks might miss. Don't dismiss integration test failures as "just test environment issues" - they often reveal real problems.