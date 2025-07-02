# Integration Test Database Cleanup

This document explains the database cleanup system for integration tests.

## Overview

The integration tests use a comprehensive cleanup system to ensure test isolation and prevent data pollution between test runs.

## Cleanup Levels

### 1. Automatic Cleanup (Recommended)

The integration tests automatically clean up after themselves using the following patterns:

- **Before Each Test**: Ensures clean state and clears browser storage
- **After Each Test**: Cleans up test data but preserves test users for performance
- **After All Tests**: Performs complete cleanup including test users

### 2. Manual Cleanup Scripts

#### Complete Database Cleanup
```bash
# Clean up all test data using the database helper
pnpm test:integration:cleanup
```

#### Using Supabase MCP (Complete Cleanup)
If you need to completely clean the database including auth tables:

```bash
# This requires running the Supabase MCP cleanup manually
# See the Supabase MCP documentation for details
```

## Cleanup Components

### 1. Database Helper (`database-setup.ts`)

- `cleanupTestData(pattern)` - Cleans data matching a test pattern
- `cleanupAllTestData()` - Removes all data from public tables
- `cleanupTestUsers()` - Removes test user profiles
- `getTestDataCounts()` - Returns record counts for monitoring

### 2. Cleanup Patterns (`cleanup-patterns.ts`)

- `CleanupHelper` - Main cleanup orchestrator
- `cleanupBetweenTests()` - Lightweight cleanup between tests
- `cleanupAfterAllTests()` - Complete cleanup after test suite
- `ensureTestIsolation()` - Resets state before tests

### 3. Test Environment (`test-environment.ts`)

Global setup and teardown for all integration tests:
- Initializes cleanup helpers
- Ensures clean state at test suite start
- Performs final cleanup after all tests

## Cleanup Order

To handle foreign key constraints properly, cleanup follows this order:

1. **Dependent Records First**:
   - Shoutouts (references users)
   - Event attendances (references events + users)
   - Direct messages (references users)
   - Conversations (references users)
   - Notifications (references users)

2. **Main Entity Records**:
   - Resources (references communities + users)
   - Community memberships (references communities + users)
   - Events (references communities)
   - Communities (references users)

3. **User Records Last**:
   - Profiles (public table)
   - Auth users (requires service role - limited cleanup)

## Monitoring Cleanup

### View Cleanup Logs
```bash
# Run integration tests with verbose logging
VITEST_VERBOSE=true pnpm test:integration
```

### Check Database State
```javascript
// Get current record counts
const { dbHelper } = require('./setup/database-setup');
const counts = await dbHelper.getTestDataCounts();
console.log(counts);
```

## Troubleshooting

### Tests Failing Due to Data Pollution

1. **Run manual cleanup**:
   ```bash
   pnpm test:integration:cleanup
   ```

2. **Check for orphaned data**:
   ```bash
   VITEST_VERBOSE=true pnpm test:integration
   ```

3. **Complete database reset** (if needed):
   Use Supabase MCP to delete all records from all tables

### Cleanup Not Working

1. **Check environment variables** in `.env.local`
2. **Verify Supabase permissions** - some operations require service role
3. **Check foreign key constraints** - may need manual intervention

## Best Practices

### For Test Writers

1. **Use test data factories** - ensures consistent test data patterns
2. **Don't rely on specific data** - tests should create their own data
3. **Use descriptive names** - include "test" or "Test" in titles/names
4. **Clean up manually if needed** - tests can call cleanup helpers directly

### For Cleanup Maintenance

1. **Monitor cleanup logs** - ensure all operations succeed
2. **Update cleanup order** - when adding new tables with foreign keys
3. **Test cleanup scripts** - ensure they work in CI/CD environments
4. **Document new patterns** - when adding new cleanup requirements

## Environment Considerations

### Local Development
- Cleanup runs automatically
- Manual cleanup available via scripts
- Full logging available with `VITEST_VERBOSE=true`

### CI/CD
- Automatic cleanup ensures clean state between runs
- May require additional permissions for complete auth cleanup
- Monitor for cleanup timeouts or failures

### Production
- **Never run these cleanup scripts against production**
- Use separate test database/environment
- Implement additional safeguards against accidental production cleanup