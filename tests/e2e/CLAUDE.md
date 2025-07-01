# E2E Testing Guidelines for Belong Platform

This document provides guidance for maintaining and writing E2E tests that focus on validating the `@belongnetwork/platform` package functionality.

## Test Purpose and Scope

The E2E tests in this directory are designed to validate that the **platform package works correctly**, not to test the test application itself.

### ✅ What E2E Tests Should Validate

**Platform Authentication:**
- Sign up and sign in functionality
- Authentication error handling
- User session management

**Platform Data Fetching:**
- Communities hook behavior (`useCommunities`)
- Resources hook behavior (`useResources`) 
- Events hook behavior (`useEvents`)
- Error states and loading states

**Platform Integration:**
- End-to-end user workflows using platform hooks
- Cross-feature interactions (auth + data fetching)

### ❌ What E2E Tests Should NOT Test

**Test App Infrastructure:**
- React Router navigation between pages
- UI component styling and layout
- HTML5 form validation
- Console errors from test app setup
- Network error simulation (test app behavior)

**Implementation Details:**
- Test app's navigation components
- Test app's page components
- Test app's routing configuration

## Test Structure

### Current Test Files

**Authentication Tests**
- `auth/basic-auth.spec.ts` - Core platform authentication (sign up/in, error handling)
- `auth/auth-persistence.spec.ts` - Platform session management and persistence
- `auth/platform-auth-behavior.spec.ts` - Platform authentication behavior validation

**Communities Tests**
- `communities/basic-communities.spec.ts` - Platform communities hook behavior and auth integration
- `communities/community-crud.spec.ts` - Platform community CRUD operations
- `communities/community-crud-with-auth-validation.spec.ts` - Platform community operations with authentication reliability testing

**Resources Tests**
- `resources/basic-resources.spec.ts` - Platform resources hook behavior and auth integration

**User Journey Tests**
- `user-journeys/complete-workflow.spec.ts` - End-to-end platform workflow validation

## Cleanup History

The following tests were removed because they tested the test app rather than the platform:

### Removed Files (20 tests total)
- `smoke/basic-navigation.spec.ts` - All React Router navigation tests
- `smoke/platform-integration.spec.ts` - All console error and app loading tests
- `auth/ui-navigation-auth-test.spec.ts` - React Router vs page.goto() navigation tests
- `auth/auth-state-validation.spec.ts` - DOM attribute and UI element auth state checks
- `communities/community-crud-simple.spec.ts` - Diagnostic test focused on error reporting

### Removed Individual Tests
- Network error handling tests (tested test app error boundaries)
- Cross-page navigation tests (tested React Router)
- UI form validation tests (tested HTML5 validation, not platform)
- Browser storage inspection tests (tested test app storage handling)
- React Strict Mode impact tests (tested test app configuration)
- Page object pattern comparison tests (tested test infrastructure)

## Writing New E2E Tests

### Guidelines for New Tests

1. **Focus on Platform Behavior**: Test how the platform hooks and services behave, not how the test app implements them

2. **Test Real Scenarios**: Use realistic user workflows that exercise multiple platform features together

3. **Validate Data Flow**: Ensure data flows correctly through authentication, hooks, and error states

4. **Avoid UI Testing**: Don't test button clicks, form layouts, or navigation - focus on platform API behavior

### Example Good Test
```typescript
test('should handle authentication and data fetching workflow', async () => {
  // Sign up user
  await authPage.signUp(email, password, firstName)
  
  // Verify platform auth state
  expect(await authPage.isAuthenticated()).toBe(true)
  
  // Test platform data hooks work with auth
  await communitiesPage.goto()
  const communities = await communitiesPage.getCommunities()
  expect(communities).toBeDefined()
})
```

### Example Bad Test (Don't Do This)
```typescript
test('should navigate between pages using nav links', async () => {
  await page.click('[data-testid="nav-communities"]')
  await expect(page).toHaveURL('/communities')
  // This tests the test app's navigation, not the platform
})
```

## Test App Purpose

The test application (`test-app/`) exists solely to provide a minimal React environment for exercising platform functionality. It should:

- Import and use platform hooks
- Display platform data and states
- Handle platform errors appropriately
- Provide a way to test real user workflows

The test app is **not** the subject under test - it's just the vehicle for testing the platform.

## Debugging and Maintenance

When tests fail, consider:

1. **Is this a platform issue?** - The hook/service isn't working correctly
2. **Is this a test app issue?** - The test app has a bug (fix the test app, don't write tests for it)
3. **Is this an environment issue?** - Missing configuration, network problems, etc.

Focus debugging efforts on platform functionality, not test app implementation details.