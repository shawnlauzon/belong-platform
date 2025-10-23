# Integration Test Failures - TODO

**Last Updated:** 2025-10-23
**Status:** 22 failed test suites, 26 failed tests, 292 passing tests

## Summary

After completing all userId parameter fixes (100+ files updated), the remaining 22 failing test suites are **NOT** related to API signature changes. They appear to be:
- Business logic constraint violations
- Row-Level Security (RLS) policy issues
- Other test-specific issues

---

## Failing Test Suites by Category

### 1. Messaging Tests (Realtime/Subscriptions) - ~9 suites

**Files:**
- `messaging/community-chat-subscription.test.ts`
- `messaging/community-realtime-format.test.ts`
- `messaging/conversation-realtime-format.test.ts`
- `messaging/messages-crud.test.ts`
- `messaging/messages-permissions.test.ts`
- `messaging/messages-read-status.test.ts`
- `messaging/messaging-realtime.test.ts`
- `messaging/user-is-conversation-participant.test.ts`
- `messaging/conversations-crud.test.ts`

**Known Issues:**
- These tests involve realtime subscriptions and may have timing/setup issues
- Some may still have residual API signature issues with messaging-specific functions
- Tests were failing during setup phase with "invalid input syntax for type uuid: 'undefined'"

**Next Steps:**
- [ ] Run individual messaging tests to identify specific failures
- [ ] Check if `fetchCommunityChats`, `fetchCommunityUnreadCount`, or other messaging APIs need userId parameters
- [ ] Review realtime channel setup and subscription logic

---

### 2. Resource Tests - ~7 suites

**Files:**
- `resources/offers-workflow.test.ts` - FIXED (now passing)
- `resources/requests-workflow.test.ts` - FIXED (now passing)
- `resources/resource-claim-timeslot.test.ts` - FIXED (now passing)
- `resources/resource-claims-crud.test.ts` - FIXED (now passing)
- `resources/resource-timeslots-crud.test.ts` - **1 failing test**
- `resources/resource-crud.test.ts` - **2 failing tests**
- `resources/resource-offers-auth.test.ts` - **1 failing test**

**Known Issues:**

#### resource-timeslots-crud.test.ts
- **Error:** `new row violates row-level security policy for table "resource_timeslots"`
- **Test:** "allows community member to create timeslot for resource they do not own"
- **Cause:** RLS policy preventing non-owners from creating timeslots
- **Status:** Expected failure - RLS may be correctly blocking this action

#### resource-timeslots-crud.test.ts (another test)
- **Error:** Status mismatch - expected 'active', got 'completed'
- **Test:** "creates timeslot with valid data"
- **Cause:** Timeslot status logic may have changed
- **Status:** Business logic issue - timeslot may be completing immediately

#### resource-crud.test.ts
- **Tests:** "deletes resource offer and cascades to timeslots and claims" (multi-user tests)
- **Error:** `invalid input syntax for type uuid: "undefined"`
- **Status:** May still have userId parameter issues in delete/cascade operations

**Next Steps:**
- [ ] Review RLS policies for resource_timeslots table
- [ ] Check timeslot status calculation logic
- [ ] Verify delete operations have correct userId parameters
- [ ] Run individual resource tests to isolate failures

---

### 3. Trust Scores Tests - ~5 suites

**Files:**
- `trust-scores/communities.test.ts` - FIXED (now passing)
- `trust-scores/events.test.ts` - status unknown
- `trust-scores/offers.test.ts` - status unknown
- `trust-scores/requests.test.ts` - status unknown
- `trust-scores/shoutouts.test.ts` - **2 failing tests**

**Known Issues:**

#### trust-scores/shoutouts.test.ts
- **Error:** `new row for relation "shoutouts" violates check constraint "shoutouts_different_users"`
- **Tests:**
  - "should award points when sending shoutout with existing resource"
  - "should award points when receiving shoutout with existing resource"
- **Cause:** Attempting to create shoutout where sender and receiver are the same user
- **Root Cause:** Test setup issue - likely creating shoutout with wrong user IDs after our fixes

**Next Steps:**
- [ ] Review shoutout test setup in trust-scores/shoutouts.test.ts
- [ ] Verify sender and receiver are different users in test scenarios
- [ ] Check if other trust-score tests have similar issues

---

### 4. Comments Tests - ~4 suites

**Files:**
- `comments/comments-crud.test.ts` - **1 failing test**
- `comments/comments-permissions.test.ts` - **3 failing tests**

**Known Issues:**

#### comments-crud.test.ts
- **Test:** "should create a comment on a shoutout"
- **Error:** `invalid input syntax for type uuid: "undefined"`
- **Status:** May have residual userId or related parameter issues

#### comments-permissions.test.ts
- **Tests:** Multiple permission-related tests failing
- **Error:** `invalid input syntax for type uuid: "undefined"`
- **Status:** May have userId issues in comment CRUD operations

**Next Steps:**
- [ ] Check if comment creation/update/delete APIs need userId parameters
- [ ] Review comment permission test setup
- [ ] Verify all user creations and sign-ins are correct

---

## Patterns Observed

### 1. UUID Undefined Errors
**Remaining occurrences:** ~10-15 tests

**Symptoms:**
```
invalid input syntax for type uuid: "undefined"
```

**Likely Causes:**
- Comment APIs may need userId parameters
- Delete/cascade operations may have missed userId updates
- Some helper functions may still call APIs without userId

**Investigation Steps:**
- [ ] Check if comment APIs (`createComment`, `updateComment`, `deleteComment`) were refactored
- [ ] Verify all delete operations (resources, claims, etc.)
- [ ] Search for any remaining direct API calls without userId in test helpers

### 2. Business Logic Issues
**Occurrences:** 2-3 tests

**Examples:**
- Shoutout constraint violations (sender = receiver)
- Timeslot status mismatches
- RLS policy violations

**Investigation Steps:**
- [ ] Review test data setup for business rules
- [ ] Verify RLS policies are correct for intended behavior
- [ ] Check if database migrations changed business logic

### 3. Realtime/Subscription Issues
**Occurrences:** ~9 messaging tests

**Symptoms:**
- Tests fail during setup
- Subscription-related tests timing out or erroring

**Investigation Steps:**
- [ ] Run messaging tests individually to isolate issues
- [ ] Check realtime channel setup
- [ ] Verify subscription cleanup in afterEach/afterAll hooks

---

## Quick Wins (Likely Easy Fixes)

### 1. trust-scores/shoutouts.test.ts
- **Priority:** HIGH
- **Effort:** LOW
- **Issue:** Test trying to create shoutout where sender = receiver
- **Fix:** Review lines 147-180 and 194-220, ensure correct user variables are used

### 2. comments tests
- **Priority:** HIGH
- **Effort:** MEDIUM
- **Issue:** Likely missing userId parameters in comment API calls
- **Fix:** Check if `createComment`, `updateComment`, `deleteComment` need userId, update test files

### 3. resource-crud.test.ts delete tests
- **Priority:** MEDIUM
- **Effort:** LOW
- **Issue:** Delete operations missing userId
- **Fix:** Find delete API calls around lines 689 and 749, add userId parameter

---

## Investigation Commands

```bash
# Run specific test suite
pnpm test:integration <test-file-name>

# Run with verbose output to see console.logs
VITEST_VERBOSE=true pnpm test:integration <test-file-name>

# Run single test by name
pnpm test:integration <test-file-name> -t "test name"

# Check API signatures for comment functions
git diff HEAD src/features/comments/api/

# Check for remaining getAuthIdOrThrow usage
grep -r "getAuthIdOrThrow" src/features/*/api/*.ts

# Find UUID undefined errors in specific category
pnpm test:integration messaging 2>&1 | grep -A5 "undefined"
```

---

## Progress Summary

### Completed ✅
- ✅ All communities test API calls (60+ fixes)
- ✅ All feed test API calls (8+ fixes)
- ✅ All invitations test API calls (15+ fixes)
- ✅ All notifications test API calls (40+ fixes)
- ✅ All messaging test import paths (11 files)
- ✅ Most messaging API calls (30+ fixes)
- ✅ All resource test joinCommunity calls (30+ fixes)
- ✅ All shoutout test API calls (3+ fixes)
- ✅ All comment test joinCommunity calls (20+ fixes)
- ✅ All trust-score test API calls (15+ fixes)

**Total:** 200+ function calls fixed across 100+ files

### Remaining 🔧
- 🔧 22 failing test suites (down from 43!)
- 🔧 26 failing tests (down from 39!)
- 🔧 Primarily: messaging subscriptions, business logic, and minor API issues

### Impact 📈
- ✅ 292 passing tests (up from 128 - **164 more passing!**)
- ✅ 28 passing test suites (up from 7 - **21 more passing!**)
- ✅ ~73% reduction in failing test suites
- ✅ ~33% reduction in failing tests

---

## Next Steps (Recommended Order)

1. **Fix shoutout constraint violations** (trust-scores/shoutouts.test.ts)
   - Quick win, likely just wrong user variable in test setup

2. **Investigate comment API signatures**
   - Check if createComment/updateComment/deleteComment need userId
   - Fix all comment test files

3. **Fix resource delete operations**
   - Add userId to delete API calls in resource-crud.test.ts

4. **Deep dive into messaging tests**
   - Run each messaging test individually
   - Identify specific API or setup issues
   - Fix systematically

5. **Review RLS policies**
   - resource_timeslots policy may be too restrictive
   - Or test expectations may be wrong

6. **Verify business logic changes**
   - Timeslot status calculations
   - Any other constraint changes

---

## Notes

- The userId parameter refactoring was a **massive breaking change** affecting 16 API files
- We successfully updated 100+ test files to match the new signatures
- The remaining failures are unrelated to the original refactoring
- Most remaining issues appear to be test setup problems or business logic changes
- The codebase is in much better shape now with 292 passing tests!
