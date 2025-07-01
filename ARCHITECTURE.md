# Belong Network Platform Architecture

This document describes the internal architecture of the Belong Network platform for platform developers. For usage information, see [USAGE.md](./USAGE.md).

## Table of Contents

1. [Overview](#overview)
2. [Package Structure](#package-structure)
3. [Architecture Principles](#architecture-principles)
4. [Implementation Patterns](#implementation-patterns)
5. [Data Layer Architecture](#data-layer-architecture)
6. [Testing Patterns](#testing-patterns)
7. [Contributing Guidelines](#contributing-guidelines)
8. [Future Considerations](#future-considerations)

## Overview

The Belong Network platform is a TypeScript monorepo built with React Query and Supabase. It uses a service-based architecture with manual transformers, dependency injection, and consolidated hooks.

### Tech Stack

- **Runtime**: React 18, TypeScript
- **Data Fetching**: TanStack Query (React Query) v5
- **Database**: Supabase (PostgreSQL + PostGIS for spatial data)
- **Build**: Vite with pnpm workspaces
- **Testing**: Vitest with jsdom and Testing Library

## Package Structure

The platform consists of three core packages:

### @belongnetwork/types

**Purpose**: Shared TypeScript type definitions and database schema types

#### Current Transformer Architecture

The platform currently uses manual transformer functions for data conversion between database and domain objects:

```typescript
// transformers/communityTransformer.ts
export function toDomainCommunity(
  dbCommunity: CommunityRow & { organizer: ProfileRow },
): Community {
  const coords = dbCommunity.center
    ? parsePostGisPoint(dbCommunity.center)
    : undefined;

  return {
    id: dbCommunity.id,
    name: dbCommunity.name,
    organizerId: dbCommunity.organizer_id,
    center: coords,
    organizer: toDomainUser(dbCommunity.organizer),
    // ... other field mappings
  };
}

export function forDbInsert(community: CommunityData): CommunityInsertDbData {
  return {
    name: community.name,
    organizer_id: community.organizerId,
    center: community.center ? toPostGisPoint(community.center) : undefined,
    // ... other field mappings
  };
}
```

#### Transformer Patterns

Each entity follows consistent transformation patterns:

- **`toDomainX()`**: Convert database row to full domain object with relations
- **`toXInfo()`**: Convert database row to lightweight info object for lists
- **`forDbInsert()`**: Convert domain data to database insert format
- **`forDbUpdate()`**: Convert partial domain data to database update format

### @belongnetwork/core

**Purpose**: Shared utilities, configuration, and client creation

### @belongnetwork/platform (API Package)

**Purpose**: React Query hooks and data layer implementation

```
packages/api/
├── src/
│   ├── auth/
│   │   ├── hooks/         # Authentication hooks
│   │   ├── services/      # Auth service layer
│   │   └── providers/     # BelongProvider component (exported from main package)
│   ├── communities/
│   │   ├── hooks/         # Community data hooks
│   │   ├── services/      # Community service layer
│   │   └── transformers/  # Data transformation logic
│   ├── resources/
│   │   ├── hooks/         # Resource data hooks
│   │   ├── services/      # Resource service layer
│   │   └── transformers/  # Data transformation logic
│   ├── events/
│   │   ├── hooks/         # Event data hooks
│   │   ├── services/      # Event service layer
│   │   └── transformers/  # Data transformation logic
│   ├── shoutouts/
│   │   ├── hooks/         # Shoutouts data hooks
│   │   ├── services/      # Shoutouts service layer
│   │   └── transformers/  # Data transformation logic
│   ├── users/
│   │   ├── hooks/         # User data hooks
│   │   ├── services/      # User service layer
│   │   └── transformers/  # Data transformation logic
│   ├── shared/
│   │   └── queryKeys.ts   # Centralized query key management
│   └── test-utils/        # Shared testing utilities
```

**Key Responsibilities**:

- Expose React hooks for all data operations
- Implement caching and synchronization with React Query
- Provide the main BelongProvider component
- Handle data transformations and business logic
- Centralize service layer implementations
- Maintain consistent transformer patterns across entities

---

## Architecture Principles

### 1. Provider-Based Architecture

The platform uses dependency injection through React Context:

```typescript
export function BelongProvider({ children, config }: BelongProviderProps) {
  const client = useMemo(() => createBelongClient(config), [config]);

  return (
    <ClientContext.Provider value={client}>
      <BelongContextProvider>
        {children}
      </BelongContextProvider>
    </ClientContext.Provider>
  );
}
```

### 2. Dependency Injection Pattern

All services are factories that accept their dependencies:

```typescript
export const createAuthService = (supabase: SupabaseClient) => ({
  async signIn(email: string, password: string) {
    // Implementation using injected supabase client
  },
});
```

### 3. Type Safety Requirements

- No `any` types allowed
- Use discriminated unions for complex states
- Leverage generated database types for consistency
- All functions must have explicit return types

## Implementation Patterns

### Service Layer Pattern

Services encapsulate business logic and Supabase interactions:

```typescript
export const createCommunityService = (supabase: SupabaseClient<Database>) => ({
  async fetchCommunities(): Promise<CommunityInfo[]> {
    const { data, error } = await supabase
      .from("communities")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("Failed to fetch communities", { error });
      throw error;
    }

    return (data || []).map(toCommunityInfo);
  },
});
```

### Hook Implementation Pattern

Consolidated hook pattern for each entity with manual data fetching:

```typescript
export function useCommunities() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const service = createCommunityService(supabase);

  // List communities query - disabled by default to prevent automatic fetching
  const communitiesQuery = useQuery<CommunityInfo[], Error>({
    queryKey: queryKeys.communities.all,
    queryFn: () => service.fetchCommunities(),
    staleTime: 5 * 60 * 1000,
    enabled: false, // Prevent automatic fetching
  });

  const createMutation = useMutation({
    mutationFn: service.createCommunity,
    onSuccess: () => {
      // Simplified cache invalidation
      queryClient.invalidateQueries({ queryKey: ["communities"] });
    },
  });

  return {
    // State (for internal use - data not automatically populated)
    communities: communitiesQuery.data,
    isLoading: communitiesQuery.isLoading,
    error: communitiesQuery.error,

    // Manual fetch operation
    retrieve: async (options?: { includeDeleted?: boolean }) => {
      const result = await queryClient.fetchQuery({
        queryKey: queryKeys.communities.all,
        queryFn: () => service.fetchCommunities(options),
        staleTime: 5 * 60 * 1000,
      });
      return result;
    },

    // Mutations
    create: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
}
```

**Key Pattern Changes**:
- **No Constructor Parameters**: Hooks take no initial parameters
- **Manual Fetching**: Use `retrieve(filters?)` for data fetching with dynamic filters
- **Disabled Auto-fetch**: `enabled: false` prevents automatic query execution
- **Simplified Caching**: Broad invalidation patterns using base entity keys
- **Flexible Filtering**: Apply different filters per call without recreating hooks

### File Organization

```
feature/
├── hooks/           # Public API - consolidated hooks
│   ├── index.ts
│   └── useCommunities.ts  # Single hook per entity
├── services/        # Service factories
│   └── community.service.ts
├── transformers/    # Data transformation logic
│   └── communityTransformer.ts
└── index.ts         # Feature exports
```

**Architecture Migration Notes**:
- **Completed**: Migration from `impl/` pattern to `services/` + `transformers/` pattern
- **Current Structure**: All business logic now centralized in service layer
- **Transformation Logic**: Moved to dedicated transformer files for consistency
- **Removed**: `impl/` directories have been eliminated across all features

## Data Layer Architecture

### Service-Based Architecture

The platform uses a service-based architecture where each domain entity has:

1. **Service Layer**: Centralized business logic and data access
2. **Transformer Layer**: Consistent data transformation patterns
3. **Hook Layer**: React Query integration and state management

### Data Fetching Strategies

The platform uses two main data fetching strategies:

#### 1. Cache Assembly Pattern

Default pattern, used for: Resources, Events, Shoutouts - where related data is often already cached

```typescript
async fetchResourceWithRelations(id: string) {
  // Fetch base resource
  const resource = await this.fetchResource(id);

  // Assemble related data from cache or fetch if needed
  const owner = 
    queryClient.getQueryData(['user', resource.ownerId]) ||
    (await this.userService.fetchUserById(resource.ownerId));

  return { ...resource, owner };
}
```

#### 2. SQL Joins Pattern

Used for: Communities - where related data is often not cached

```typescript
async fetchCommunityWithRelations(id: string) {
  const { data } = await supabase
    .from('communities')
    .select(`
      *,
      organizer:users!organizer_id(*)
    `)
    .single();
    
  return toCommunityWithRelations(data);
}
```

### Query Key Convention

Centralized query key management in `shared/queryKeys.ts`:

```typescript
export const queryKeys = {
  auth: ["auth"],
  users: {
    all: ["users"],
    byId: (id: string) => ["user", id],
  },
  communities: {
    all: ["communities"],
    byId: (id: string) => ["community", id],
    memberships: (communityId: string) => ["community", communityId, "memberships"],
  },
};
```

This centralized approach ensures:
- Consistent cache invalidation patterns
- Easier maintenance and updates
- Better query dependency management
- Reduced cache key duplication

## Testing Patterns

### Platform Testing Principles

The testing architecture follows specific patterns optimized for this dependency injection-based platform:

#### 1. **Dependency Injection-Aware Mocking**

The platform uses React Context for dependency injection, which requires careful mocking strategy:

```typescript
// ✅ Correct: Mock at the client creation level
vi.mock('../../../../config/client', () => {
  const mockSupabaseAuth = {
    signUp: vi.fn(),
    getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
  };

  const mockClient = {
    supabase: { auth: mockSupabaseAuth },
    logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    mapbox: { autocomplete: vi.fn(), reverseGeocode: vi.fn() },
  };

  return { createBelongClient: vi.fn(() => mockClient) };
});

// ❌ Avoid: Complex multi-level mocking that creates circular dependencies
vi.mock('useSupabase');
vi.mock('createBelongClient');
vi.mock('shared'); // Creates conflicts
```

#### 2. **Mock Strategy Hierarchy**

Follow this hierarchy for effective mocking:

1. **External Dependencies Only** (Preferred): Mock Supabase client, external APIs
2. **Configuration Level**: Mock `createBelongClient` for controlled dependency injection
3. **Hook Level**: Mock platform hooks when testing UI components
4. **Service Level**: Rarely needed - prefer dependency injection

```typescript
// Level 1: External Dependencies (Best for unit tests)
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

// Level 2: Configuration Level (Good for integration-style tests)
vi.mock('./config/client', () => ({
  createBelongClient: vi.fn(() => mockClient),
}));

// Level 3: Hook Level (Good for component tests)
vi.mock('@belongnetwork/platform', () => ({
  useCommunities: () => ({ communities: mockData, create: vi.fn() }),
}));
```

#### 3. **Provider Pattern Testing**

When testing with `BelongProvider`, ensure proper mock application:

```typescript
describe('Feature Tests', () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: any }) => any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get mocked client after module mocking
    const { createBelongClient } = await import('./config/client');
    const mockClient = vi.mocked(createBelongClient)({
      supabaseUrl: 'test-url',
      supabaseAnonKey: 'test-key',
      mapboxPublicToken: 'test-token',
    });

    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    wrapper = ({ children }) =>
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(BelongProvider, { config: testConfig }, children)
      );
  });
});
```

#### 4. **Common Mocking Anti-Patterns to Avoid**

```typescript
// ❌ Don't mock platform code when testing platform code
vi.mock('../services/auth.service'); // Testing auth hook? Use real service

// ❌ Don't create circular dependencies
vi.mock('useSupabase', () => /* depends on BelongProvider context */);

// ❌ Don't over-mock - creates complexity and hides real issues
vi.mock('useSupabase');
vi.mock('createBelongClient');  
vi.mock('shared');
vi.mock('BelongProvider'); // Way too much!

// ❌ Don't mock at multiple levels simultaneously
vi.mock('config/client');
vi.mock('shared/hooks/useSupabase'); // Conflicts with above
```

#### 5. **Testing Real Code Paths**

The goal is to test as much real code as possible while controlling external dependencies:

```typescript
// ✅ This test exercises real platform code
// useSignUp → createAuthService → authService.signUp → mocked Supabase
const signUp = useSignUp();
await signUp.mutateAsync({ email, password, firstName });

// ❌ This test doesn't exercise any real code
const mockSignUp = vi.fn();
vi.mock('useSignUp', () => ({ useSignUp: () => ({ mutateAsync: mockSignUp }) }));
```

### Testing Architecture Best Practices

#### Unit Testing Strategy

1. **Mock External Dependencies**: Supabase, external APIs, browser APIs
2. **Use Real Platform Code**: Services, transformers, hooks, components
3. **Dependency Injection**: Mock at the client creation level for full integration
4. **Test Data**: Use `createMock*` utilities for consistent test data

```typescript
// ✅ Proper unit test structure
describe('useSignUp', () => {
  beforeEach(() => {
    // Mock only external dependency
    vi.mock('config/client', () => ({
      createBelongClient: vi.fn(() => mockClientWithControlledSupabase),
    }));
  });

  it('should call Supabase with correct parameters', async () => {
    const signUp = useSignUp(); // Real hook
    await signUp.mutateAsync(mockSignUpData); // Real execution path
    
    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: mockSignUpData.email,
      password: mockSignUpData.password,
      options: { data: { first_name: mockSignUpData.firstName } },
    });
  });
});
```

#### Component Testing Strategy

1. **Mock Platform Hooks**: When testing UI components, mock the data layer
2. **Test User Interactions**: Focus on component behavior, not data fetching
3. **Use Testing Library**: For user-centric testing approaches

```typescript
// ✅ Component test with mocked hooks
vi.mock('@belongnetwork/platform', () => ({
  useSignUp: () => ({
    mutateAsync: mockSignUp,
    isPending: false,
    error: null,
  }),
}));

test('SignUpForm submits with correct data', async () => {
  render(<SignUpForm />);
  
  await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
  await userEvent.click(screen.getByRole('button', { name: /sign up/i }));
  
  expect(mockSignUp).toHaveBeenCalledWith({
    email: 'test@example.com',
    // ... other expected data
  });
});
```

### Critical Lessons from useSignUp Test Fix

The `useSignUp` test failures revealed key insights about mocking in this architecture:

#### Problem: Over-Complex Mocking
- **Issue**: Mocking at multiple levels (`useSupabase`, `createBelongClient`, `shared`) created conflicts
- **Root Cause**: Circular dependencies between mocks and real provider code
- **Result**: Mocks weren't applied correctly, tests failed with 0 function calls

#### Solution: Simplified Strategic Mocking
- **Strategy**: Mock only `createBelongClient` at the configuration level
- **Benefit**: Real application code path executes while controlling external dependencies
- **Result**: All tests pass, real code coverage, proper behavior validation

#### Architecture Implications
1. **Provider Pattern Works**: When mocked correctly, dependency injection enables clean testing
2. **Mock Hierarchy Matters**: Lower-level mocks (config) are more stable than higher-level mocks (hooks)
3. **Real Code Testing**: Testing real platform code provides better confidence than mock-heavy tests

### Integration Testing

Keep integration tests separate with real Supabase connections:

```typescript
// vitest.integration.config.ts
export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.{ts,tsx}"],
    setupFiles: ["./tests/integration/setup.ts"],
    // Use real environment, no mocks
  },
});
```

Integration tests should:
- Use real Supabase instances (test databases)
- Test actual network requests and responses
- Validate end-to-end user workflows
- Complement unit tests by catching integration issues

## Contributing Guidelines

### Implementation Checklist

When adding new features to the platform:

1. **Create Service Layer**
   - Factory function accepting Supabase client
   - Use transformers for validation and transformation
   - Add proper error handling and logging

2. **Create Transformer Layer**
   - `toDomainX()` functions for full objects
   - `toXInfo()` functions for lightweight lists
   - `forDbInsert()` and `forDbUpdate()` functions

3. **Create Consolidated Hook**
   - One hook per entity with all operations (no constructor parameters)
   - Include `retrieve(filters?)` function for manual data fetching
   - Disable automatic query fetching with `enabled: false`
   - Return object with state, retrieve function, and mutations
   - Implement simplified cache invalidation patterns

4. **Add Tests (Critical Requirements)**
   - **Unit Tests**: Follow dependency injection mocking patterns (mock at config level)
   - **Test Real Code**: Use real services, transformers, and hooks with mocked external dependencies
   - **Avoid Over-Mocking**: Don't mock platform code when testing platform functionality
   - **Use Mock Factories**: Leverage `createMock*` utilities for consistent test data
   - **Test Coverage**: Ensure both success and error paths are covered
   - **Integration Tests**: Add for critical user workflows with real Supabase connections

5. **Update Exports**
   - Export hook from feature index.ts
   - Update package exports if needed

### Testing Quick Reference

**When to use each mocking level:**

| Test Type | Mock Level | Use Case | Example |
|-----------|------------|----------|---------|
| Unit Tests (Platform Code) | Config Level | Testing hooks, services, transformers | `vi.mock('config/client')` |
| Unit Tests (External) | External Dependencies | Testing with isolated externals | `vi.mock('@supabase/supabase-js')` |
| Component Tests | Hook Level | Testing UI components | `vi.mock('@belongnetwork/platform')` |
| Integration Tests | None | End-to-end workflows | Real Supabase, no mocks |

**Essential Test Patterns:**

```typescript
// ✅ Platform unit test pattern
vi.mock('config/client', () => ({
  createBelongClient: vi.fn(() => mockClientWithControlledDependencies)
}));

// ✅ Component test pattern  
vi.mock('@belongnetwork/platform', () => ({
  useFeature: () => ({ data: mockData, action: vi.fn() })
}));

// ✅ Real code testing
const hook = useFeature(); // Real hook execution
const result = await hook.action(input); // Real service call
expect(mockExternalDependency).toHaveBeenCalledWith(expectedParams);
```

### Example: Adding a New Entity

```typescript
// 1. Create service (services/entity.service.ts)
export const createEntityService = (supabase: SupabaseClient<Database>) => ({
  async fetchEntities(): Promise<EntityInfo[]> {
    const { data, error } = await supabase.from("entities").select("*");
    if (error) throw error;
    return (data || []).map(toEntityInfo);
  },
});

// 2. Create transformer (transformers/entityTransformer.ts)
export const toEntityInfo = (row: DbRow): EntityInfo => ({
  id: row.id,
  name: row.name,
  ownerId: row.owner_id,
  createdAt: new Date(row.created_at),
});

// 3. Create hook (hooks/useEntities.ts)
export function useEntities() {
  const queryClient = useQueryClient();
  const service = createEntityService(useSupabase());
  
  // Disabled query for manual fetching
  const entitiesQuery = useQuery({
    queryKey: queryKeys.entities.all,
    queryFn: () => service.fetchEntities(),
    staleTime: 5 * 60 * 1000,
    enabled: false,
  });

  const createMutation = useMutation({
    mutationFn: service.createEntity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entities"] });
    },
  });
  
  return {
    // State (not automatically populated)
    entities: entitiesQuery.data,
    isLoading: entitiesQuery.isLoading,
    error: entitiesQuery.error,

    // Manual fetch operation
    retrieve: async (filters?: EntityFilter) => {
      const result = await queryClient.fetchQuery({
        queryKey: filters 
          ? queryKeys.entities.filtered(filters)
          : queryKeys.entities.all,
        queryFn: () => service.fetchEntities(filters),
        staleTime: 5 * 60 * 1000,
      });
      return result;
    },

    // Mutations
    create: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
}
```

## Future Considerations

### Planned: Zod-Based Type System

The platform is planned to migrate to a Zod-based architecture as the single source of truth for all types:

```typescript
// Future: schemas/community.schema.ts
export const CommunitySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  organizerId: z.string().uuid(),
  // ... other fields
});

// Auto-generate variants
export const CommunityCreateSchema = CommunitySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Automatic DB transformations
export const CommunityDbSchema = CommunitySchema.transform(
  caseTransform.toSnakeCase,
);
export const CommunityFromDbSchema = z
  .any()
  .transform(caseTransform.toCamelCase)
  .pipe(CommunitySchema);
```

**Benefits of Future Zod Architecture**:
- Single source of truth for all type definitions
- Runtime validation with compile-time type safety
- Automatic transformations between DB and domain formats
- Reduced boilerplate and manual transformer functions

### Other Future Enhancements

While the architecture is designed for current needs, it's built to accommodate:

- **Offline Support**: React Query's persistence adapter can be added
- **Real-time Updates**: Supabase subscriptions can be integrated into existing hooks
- **Performance Optimization**: Virtual scrolling and pagination are supported
- **Multi-tenancy**: The provider pattern supports multiple Supabase projects

The architecture prioritizes flexibility and maintainability over premature optimization, ensuring a solid foundation for future development.