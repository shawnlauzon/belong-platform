# Platform Package Guidelines

This file provides specific guidance for working with the @belongnetwork/platform package.

## Data Fetching Patterns

**Communities**: Use SQL joins for complete data retrieval including joined profile data.

**Resources**: Use cache assembly pattern - fetch base entity first, then assemble related owner and community data through separate cached calls.

**Thanks**: Use cache assembly pattern like resources - fetch base thanks records, then batch fetch related user and resource data.

**Events**: Use cache assembly pattern like resources - fetch base events, then assemble related organizer and community data through separate cached calls.

**Activity Feeds**: Aggregate activities from existing data sources (resources, events, thanks, community memberships) rather than creating dedicated activity tables.

## Testing Guidelines

- Use established Supabase client mocking patterns found in existing test files
- Do not validate specific error messages
- Leverage createMock\* utilities from @belongnetwork/platform/src/test-utils
- Follow the transformer testing patterns: mock the transformer functions rather than complex data setup
- Tests that validate edge cases are ok to skip if necessary

## Data Access Patterns

- Follow transformer patterns: toDomain\* functions convert DB rows to domain objects
- Use forDb\* functions to convert domain objects for database operations
- Communities use SQL joins, Resources use cache assembly
- Handle errors gracefully with proper logging via the core logger

## Code Organization

- Import only from root features, never from impl. Export necessary functions as needed using the feature index.ts file
- Use React Query hooks from @belongnetwork/platform for all data fetching
- Import shared types from @belongnetwork/types

## Type Safety

- Use generated database types from @belongnetwork/types
- Prefer type-safe patterns over casting or type assertions
- Handle null values from fetch functions properly (e.g., fetchUserById can return null)
