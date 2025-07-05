# Unit Testing Guidelines

This document provides comprehensive guidelines for writing unit tests in the Belong Network platform, based on established patterns and architectural principles.

## Core Testing Philosophy

### Avoid over-testing

**✅ DO**: Test only the primary business behavior
**✅ DO**: Test most non-trivial functions
**✅ DO**: Test only one thing at a time; i.e. if you are testing CRUD, don't test cache invalidation in the same test
**❌ DON'T**: Test every possible error condition
**❌ DON'T**: Test edge cases that aren't business requirements

### Test Behavior, Not Implementation

**✅ DO**: Test what the code accomplishes (business logic, outputs, error conditions)
**❌ DON'T**: Test how the code does it (internal method calls, query chains)

```typescript
// ❌ BAD: Testing implementation details
expect(mockSupabase.from).toHaveBeenCalledWith('resources');
expect(mockQuery.select).toHaveBeenCalledWith('*');
expect(mockQuery.eq).toHaveBeenCalledWith('id', resourceId);

// ✅ GOOD: Testing behavior and outputs
expect(result.id).toBe(expectedResourceId);
expect(result.title).toBe('Test Resource');
expect(mockFetchResourceById).toHaveBeenCalledWith(mockSupabase, resourceId);
```

### Benefits of Behavior-Focused Testing

- Tests remain stable during implementation refactoring
- Focus on user-visible behavior and business requirements
- Easier to understand test intentions
- Reduced test brittleness and maintenance overhead

## Project Structure

### Test File Organization

```
src/features/{feature}/
├── __mocks__/
│   └── index.ts              # Mock factories and utilities
├── __tests__/
│   ├── hooks/
│   │   ├── useFeature.test.ts
│   │   ├── useCreateFeature.test.ts
│   │   └── useUpdateFeature.test.ts
│   ├── api/
│   │   ├── fetchFeature.test.ts
│   │   └── createFeature.test.ts
│   └── transformers/
│       └── featureTransformer.test.ts
```

## Global Mock Infrastructure

### Global Setup (`vitest.setup.ts`)

The project uses comprehensive global mocks to eliminate repetitive setup:

```typescript
// Shared module mocks (useSupabase, logger, queryKeys)
vi.mock('./src/shared', () => ({
  /* comprehensive mock */
}));

// Config module mocks (createBelongClient)
vi.mock('./src/config/client', () => ({
  /* comprehensive mock */
}));

// Feature module mocks (type-safe partial mocks)
vi.mock('./src/features/users', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual, // Preserve all real exports (types, enums, etc.)
    // Override only the hooks
    useUsers: vi.fn(),
    useUser: vi.fn(),
    useCreateUser: vi.fn(),
    // ... other hooks
  };
});
```

### Shared Test Wrapper

Use the shared test wrapper for React Query + BelongProvider setup:

```typescript
import { createDefaultTestWrapper } from '@/shared/__tests__/testWrapper';

describe('useFeature', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];

  beforeEach(() => {
    ({ wrapper } = createDefaultTestWrapper());
  });

  it('should work with wrapper', () => {
    const { result } = renderHook(() => useFeature('id'), { wrapper });
    // ... test logic
  });
});
```

## Test Data Management

### Factory Functions

**Always use factory functions** from the feature's `__mocks__` directory for generating test data to ensure consistency and avoid hardcoded values:

```typescript
// ✅ GOOD: Use factories from __mocks__, only override what's needed
import { createMockUser } from '@/features/users/__mocks__';
import { createMockResourceInfo } from '@/features/resources/__mocks__';

const mockUser = createMockUser();

const mockResource = createMockResourceInfo({
  ownerId: mockUser.id,
});

// ❌ BAD: Hardcoded test data
const mockUser = {
  id: 'user-123',
  firstName: 'John',
  // ... manually typed out
};
```

### Factory Implementation Pattern

Mock factories should be placed in the feature's `__mocks__/index.ts` file and cover all data variants:

```typescript
// src/features/resources/__mocks__/index.ts
export function createMockResource(overrides?: Partial<Resource>): Resource {
  return {
    id: faker.string.uuid(),
    title: faker.commerce.productName(),
    description: faker.lorem.paragraph(),
    type: faker.helpers.arrayElement(['offer', 'request'] as const),
    category: faker.helpers.enumValue(ResourceCategory),
    owner: createMockUser(),
    community: createMockCommunity(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides, // Apply overrides last
  };
}

// Provide factories for all data variants
export function createMockResourceRow(
  overrides?: Partial<ResourceRow>,
): ResourceRow {
  return {
    id: faker.string.uuid(),
    title: faker.commerce.productName(),
    // ... database-specific fields
    ...overrides,
  };
}

export function createMockResourceInfo(
  overrides?: Partial<ResourceInfo>,
): ResourceInfo {
  const row = createMockResourceRow();
  const baseResourceInfo = toResourceInfo(row);
  return { ...baseResourceInfo, ...overrides };
}

export function createMockResourceData(
  overrides?: Partial<ResourceData>,
): ResourceData {
  return {
    title: faker.commerce.productName(),
    // ... form data fields
    ...overrides,
  };
}
```

## Mock Strategies

### Mock External Dependencies Only

**✅ DO**: Mock external dependencies (Supabase, third-party APIs)
**❌ DON'T**: Mock your own platform functions

```typescript
// ✅ GOOD: Mock external dependencies
vi.mock('../../api', () => ({
  fetchResourceById: vi.fn(),
}));

// ✅ GOOD: Mock Supabase calls in API tests
mockSupabase.from.mockReturnValue({
  select: vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ data: mockRow }),
  }),
});

// ❌ BAD: Mock your own platform functions
vi.mock('../../hooks/useResource'); // Don't do this
```

### Hook Testing Patterns

```typescript
describe('useResource', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock data using factories from __mocks__
    mockResourceInfo = createMockResourceInfo({
      ownerId: mockOwner.id,
      communityId: mockCommunity.id,
    });

    // Mock external dependencies
    mockFetchResourceById.mockResolvedValue(mockResourceInfo);
    mockUseUser.mockReturnValue(mockOwner);
    mockUseCommunity.mockReturnValue(mockCommunity);
  });

  it('should compose full Resource from ResourceInfo + User + Community', async () => {
    // Act
    const { result } = renderHook(() => useResource(mockResourceInfo.id), {
      wrapper,
    });

    // Wait for async completion
    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    // Assert: Test service contracts and outputs
    expect(result.current).toEqual(
      expect.objectContaining({
        id: mockResourceInfo.id,
        title: mockResourceInfo.title,
        owner: mockOwner, // Full User object, not just ID
        community: mockCommunity, // Full Community object, not just ID
      }),
    );

    // Should NOT have ID references (ResourceInfo pattern)
    expect(result.current).not.toHaveProperty('ownerId');
    expect(result.current).not.toHaveProperty('communityId');

    // Verify external calls were made correctly
    expect(mockFetchResourceById).toHaveBeenCalledWith(
      mockSupabase,
      mockResourceInfo.id,
    );
  });
});
```

## Architectural Testing Patterns

### Hook Types and Return Values

Based on our architecture refactor, understand the distinction between hook types:

#### Query Hooks (Immediate Execution)

Return composed domain objects immediately:

```typescript
// useResource returns full Resource object with composed data
const resource: Resource | null = useResource(id);

// Test expects composed object
expect(resource).toEqual(
  expect.objectContaining({
    owner: mockUser, // Full User object
    community: mockCommunity, // Full Community object
  }),
);
```

#### Mutation Hooks (Deferred Execution)

Return Info objects (with ID references only):

```typescript
// useCreateResource returns function that creates ResourceInfo
const createResource = useCreateResource();
const resourceData = createMockResourceData({
  ownerId: mockUser.id,
  communityId: mockCommunity.id,
});
const resourceInfo: ResourceInfo | null = await createResource(resourceData);

// Test expects Info object with ID references
expect(resourceInfo).toEqual(
  expect.objectContaining({
    ownerId: mockUser.id, // ID reference, not full object
    communityId: mockCommunity.id, // ID reference, not full object
  }),
);

// Should NOT have composed objects
expect(resourceInfo).not.toHaveProperty('owner');
expect(resourceInfo).not.toHaveProperty('community');
```

### Consumer Pattern Testing

Test the established consumer pattern for mutations:

```typescript
it('should follow create → useResource pattern', async () => {
  // 1. Create resource (returns ResourceInfo)
  const resourceData = createMockResourceData();
  const resourceInfo = await createResource(resourceData);
  expect(resourceInfo).toMatchObject({
    id: expect.any(String),
    ownerId: resourceData.ownerId,
    communityId: resourceData.communityId,
  });

  // 2. Consumer would then use useResource(id) for full composition
  // (This would be tested separately in useResource tests)
});
```

## Type Safety Requirements

### Never Use `any` Types

**✅ DO**: Use proper interfaces, union types, or type assertions
**❌ DON'T**: Use `any` types

```typescript
// ✅ GOOD: Proper typing
const mockSupabase: SupabaseClient<Database> = createMockSupabase();
const mockUser: User = createMockUser();

// ❌ BAD: Any types
const mockSupabase: any = createMockSupabase();
const mockUser: any = createMockUser();
```

### Type-Safe Mock Utilities

```typescript
// Use vi.mocked for type-safe mocking
const mockUseSupabase = vi.mocked(useSupabase);
const mockFetchResourceById = vi.mocked(fetchResourceById);

// Ensure return types match expectations
mockUseSupabase.mockReturnValue(mockSupabase);
mockFetchResourceById.mockResolvedValue(mockResourceInfo);
```

## Test-Driven Development (TDD)

### Mandatory TDD Process

**In general, always write a failing unit test BEFORE making ANY code changes**

1. **Red**: Write a failing test that demonstrates the exact problem
2. **Green**: Fix the minimum code needed to make the test pass
3. **Refactor**: Clean up implementation while keeping tests green

**Exceptions:**

- If you are refactoring and there are existing tests, you don't need to write a test

```typescript
// 1. RED: Write failing test first
it('should return ResourceInfo after creation', async () => {
  const resourceData = createMockResourceData({
    ownerId: mockCurrentUser.id,
  });
  const createResource = useCreateResource();

  // This should fail initially
  const result = await createResource(resourceData);

  expect(result).toEqual(
    expect.objectContaining({
      id: expect.any(String),
      title: resourceData.title,
      ownerId: resourceData.ownerId,
    }),
  );
});

// 2. GREEN: Implement minimum code to pass
// 3. REFACTOR: Clean up while keeping test green
```

### Test Requirements

- **Unit tests must be green** before adding new features
- **All unit tests must be green** before committing
- **Test behavior, not implementation** - verify WHAT the code accomplishes
- **No skipping tests** - a problem must fail the test, logging errors is only for debugging

## Error Handling and Edge Cases

### Test Error Conditions

```typescript
it('should handle resource not found', async () => {
  mockFetchResourceById.mockResolvedValue(null);

  const { result } = renderHook(() => useResource('nonexistent-id'), {
    wrapper,
  });

  await waitFor(() => {
    expect(result.current).toBeNull();
  });
});

it('should handle missing required data', async () => {
  mockFetchResourceById.mockResolvedValue(mockResourceInfo);
  mockUseUser.mockReturnValue(null); // Owner not found

  const { result } = renderHook(() => useResource(mockResourceInfo.id), {
    wrapper,
  });

  await waitFor(() => {
    expect(result.current).toBeNull(); // Should return null when required data missing
  });
});
```

## API Layer Testing

### Test Service Contracts

Focus on inputs, outputs, and error conditions:

```typescript
describe('fetchResourceById', () => {
  it('should return ResourceInfo when resource exists', async () ...

  it('should throw error when resource not found', async () ...
});
```

## Common Anti-Patterns to Avoid

### ❌ Don't Mock Platform Code

```typescript
// ❌ BAD: Mocking our own functions
vi.mock('../../hooks/useResource');
vi.mock('../../api/fetchResourceById');
```

### ❌ Don't Test Implementation Details

```typescript
// ❌ BAD: Testing internal query structure
expect(mockSupabase.from).toHaveBeenCalledWith('resources');
expect(mockQuery.select).toHaveBeenCalledWith('*');
```

### ❌ Don't Use Manual Cleanup

```typescript
// ❌ BAD: Manual cache clearing that masks real issues
queryClient.clear(); // Don't hide problems with workarounds
```

### ❌ Don't Use Hard-Coded Values in Tests

```typescript
// ❌ BAD: Hard-coded test values that break when data changes
const resourceId = 'resource-123';
const updateData = {
  title: 'Updated Title',
  description: 'Updated Description',
};

// ✅ GOOD: Use factories to generate realistic test data
const mockResourceInfo = createMockResourceInfo();
const updateData: Partial<ResourceData> = {
  title: faker.commerce.productName(),
  description: faker.lorem.paragraph(),
};
```

### ❌ Don't Test Beyond the Happy Path Unless Required

```typescript
// ❌ BAD: Testing edge cases that aren't business requirements
it('should handle null response from updateResource', async () => {
  mockUpdateResource.mockResolvedValue(null);
  // Testing implementation detail, not business requirement
});

it('should return a stable function reference', () => {
  // Testing React implementation detail, not behavior
});

// ✅ GOOD: Focus on the primary business behavior
it('should return ResourceInfo after update', async () => {
  // Test the main success path that users care about
});
```

### ❌ Don't Over-Test Error Scenarios

```typescript
// ❌ BAD: Testing every possible error condition
it('should handle update errors', async () => {
  // Only test errors that have specific business handling
});

it('should handle network failures', async () => {
  // Don't test generic infrastructure failures
});

// ✅ GOOD: Test meaningful business error conditions
it('should validate required fields before update', async () => {
  // Test business logic errors that matter to users
});
```

### ❌ Don't Test Complex Interactions in Unit Tests

```typescript
// ❌ BAD: Testing multiple systems working together
it('should work with complex update data including location and images', async () => {
  const complexUpdateData = {
    title: 'Updated Resource',
    imageUrls: ['https://example.com/image1.jpg'],
    location: { lat: 40.7128, lng: -74.006 },
    category: 'tools',
  };
  // This tests too many concerns at once
});

// ✅ GOOD: Keep unit tests focused on single behaviors
it('should return ResourceInfo after update', async () => {
  // Test one clear behavior with minimal data
});
```

### ❌ Don't Skip the Failing Test Step

```typescript
// ❌ BAD: Implementing without first writing a failing test
// Always prove you can reproduce the problem before fixing it
```

### ❌ Don't Deviate from Established Patterns

```typescript
// ❌ BAD: Each test file using different patterns
// File 1: Simple, clean test focused on behavior
it('should return ResourceInfo after creation', async () => {
  const mockResourceInfo = createMockResourceInfo();
  // Simple, focused test
});

// File 2: Complex test with many edge cases
it('should update resource and return ResourceInfo on success', async () => {
  // 50 lines of complex setup and assertions
});

it('should handle update errors', async () => {
  // Testing every possible error condition
});

it('should return a stable function reference', () => {
  // Testing React internals
});

// ✅ GOOD: Consistent patterns across all test files
// All hook tests follow the same simple structure:
describe('useFeatureHook', () => {
  // Standard setup using shared utilities
  beforeEach(() => {
    // Same mock setup pattern
  });

  it('should return [Domain]Info after [action]', async () => {
    // Focus on the primary business behavior
    // Use factories for test data
    // Assert on business outcomes
  });
});
```

**Key Principle**: When you see a well-working test pattern, copy it exactly. Don't innovate or add complexity - consistency is more valuable than creativity in test code.

## Integration vs Unit Test Differences

### Unit Tests

- Mock external dependencies
- Test platform logic in isolation
- Create fresh test environment per test
- Use factories and mock utilities

### Integration Tests

- No mocking of platform code
- Test real end-to-end behavior
- May share some state between tests
- Use real database/external services

## Quality Assurance

### Before Any Commit

Run the complete verification pipeline:

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

All steps must pass before committing changes.

### Test Coverage Requirements

- Each feature should have comprehensive unit test coverage
- All public APIs must have tests
- Error conditions and edge cases must be tested
- Critical business logic requires 100% coverage

## Performance Considerations

### Test Performance Best Practices

- Use factories to generate realistic test data
- Mock external dependencies to avoid network calls
- Use shared test setup utilities to reduce boilerplate
- Clear mocks in `beforeEach` to ensure test isolation

### Global Mock Benefits

- **Eliminates repetition**: No duplicate mock definitions across files
- **Ensures consistency**: All tests use identical mock structure
- **Improves performance**: Faster test setup and execution
- **Reduces maintenance**: Update mocks in single location

## Documentation and Examples

### Test Documentation

Each test should clearly document:

```typescript
it('should return full Resource object composed from ResourceInfo + User + Community', async () => {
  // Arrange: Set up test data and mocks
  // Act: Execute the code under test
  // Assert: Verify expected behavior
});
```

### Real-World Examples

See the following files for complete examples:

- `src/features/resources/__tests__/hooks/useResource.test.ts`
- `src/features/resources/__tests__/hooks/useCreateResource.test.ts`
- `src/features/resources/__tests__/api/fetchResourceById.test.ts`
- `src/features/resources/__mocks__/index.ts` - Mock factories and utilities

These demonstrate all the patterns and practices outlined in this guide, including:

- Mock factories in `__mocks__/index.ts`
- API signature updates (e.g., `createResource` without separate `ownerId` parameter)
- Proper import patterns for mock utilities
- Coverage of all data variants (Row, Info, Data, Domain objects)

---

_This document should be the single source of truth for unit testing practices in the Belong Network platform. All new tests should follow these established patterns._
