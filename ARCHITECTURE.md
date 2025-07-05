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

The Belong Network platform is a TypeScript library built with React Query and Supabase. It uses a service-based architecture with manual transformers, dependency injection, and feature-based organization.

### Tech Stack

- **Runtime**: React 18, TypeScript
- **Data Fetching**: TanStack Query (React Query) v5
- **Database**: Supabase (PostgreSQL + PostGIS for spatial data)
- **Build**: Vite
- **Testing**: Vitest with jsdom and Testing Library

## Package Structure

The platform is organized as a single package with feature-based architecture:

### @belongnetwork/platform

**Purpose**: Complete data layer with React Query hooks, services, and utilities

#### Current Transformer Architecture

The platform uses manual transformer functions for data conversion between database and domain objects:

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

### Feature-Based Organization

```
src/
├── config/              # Configuration and providers
│   ├── BelongProvider.tsx  # Main provider component
│   ├── client.ts           # Client creation
│   └── supabase.ts         # Supabase client setup
├── features/            # Feature modules
│   ├── auth/
│   │   ├── hooks/         # Authentication hooks
│   │   ├── services/      # Auth service layer (legacy pattern)
│   │   └── types/         # Auth type definitions
│   ├── communities/
│   │   ├── api/           # Community API functions
│   │   ├── hooks/         # Community data hooks
│   │   ├── transformers/  # Data transformation logic
│   │   └── types/         # Community type definitions
│   ├── resources/
│   │   ├── api/           # Resource API functions
│   │   ├── hooks/         # Resource data hooks
│   │   ├── transformers/  # Data transformation logic
│   │   └── types/         # Resource type definitions
│   ├── events/
│   │   ├── api/           # Event API functions (assumed)
│   │   ├── hooks/         # Event data hooks
│   │   ├── transformers/  # Data transformation logic
│   │   └── types/         # Event type definitions
│   ├── conversations/
│   │   ├── hooks/         # Conversation data hooks
│   │   ├── services/      # Conversation service layer (legacy pattern)
│   │   ├── transformers/  # Data transformation logic
│   │   └── types/         # Conversation type definitions
│   ├── shoutouts/
│   │   ├── api/           # Shoutout API functions (assumed)
│   │   ├── hooks/         # Shoutouts data hooks
│   │   ├── transformers/  # Data transformation logic
│   │   └── types/         # Shoutout type definitions
│   └── users/
│       ├── api/           # User API functions
│       ├── hooks/         # User data hooks
│       ├── transformers/  # Data transformation logic
│       └── types/         # User type definitions
├── shared/
│   ├── hooks/             # Shared utility hooks
│   ├── types/             # Shared type definitions (including database.ts)
│   ├── utils/             # Shared utilities
│   └── queryKeys.ts       # Centralized query key management
└── test-utils/            # Shared testing utilities
```

**Key Responsibilities**:

- Expose React hooks for all data operations
- Implement caching and synchronization with React Query
- Provide the main BelongProvider component
- Handle data transformations and business logic
- Centralize API functions for data access (with some legacy services)
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

### 2. API Function Pattern

Most features use API functions that accept their dependencies directly:

```typescript
// Modern API function pattern (most features)
export async function createCommunity(
  supabase: SupabaseClient,
  data: CommunityData
): Promise<Community> {
  // Implementation using injected supabase client
}

// Legacy service factory pattern (auth, conversations)
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

### API Function Pattern (Primary)

Most features use direct API functions for business logic and Supabase interactions:

```typescript
export async function fetchCommunities(
  supabase: SupabaseClient<Database>
): Promise<CommunityInfo[]> {
  const { data, error } = await supabase
    .from("communities")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("Failed to fetch communities", { error });
    throw error;
  }

  return (data || []).map(toCommunityInfo);
}
```

### Legacy Service Pattern

Some features (auth, conversations) still use the service factory pattern:

```typescript
export const createCommunityService = (supabase: SupabaseClient<Database>) => ({
  async fetchCommunities(): Promise<CommunityInfo[]> {
    // Implementation
  },
});
```

### Hook Implementation Pattern

Single-purpose hook pattern following React best practices:

#### Query Hooks (Data Fetching)

```typescript
// Hook for fetching communities list (modern API function pattern)
export function useCommunities(filters?: CommunityFilter) {
  const supabase = useSupabase();

  const query = useQuery<CommunityInfo[], Error>({
    queryKey: filters 
      ? queryKeys.communities.filtered(filters)
      : queryKeys.communities.all,
    queryFn: () => fetchCommunities(supabase, filters),
    staleTime: STANDARD_CACHE_TIME,
  });

  if (query.error) {
    logger.error('🏘️ API: Error fetching communities', {
      error: query.error,
      filters,
    });
  }

  return query;
}

// Hook for fetching single community
export function useCommunity(id: string) {
  const supabase = useSupabase();

  return useQuery<Community | null, Error>({
    queryKey: queryKeys.communities.byId(id),
    queryFn: () => fetchCommunityById(supabase, id),
    staleTime: STANDARD_CACHE_TIME,
    enabled: !!id,
  });
}
```

#### Mutation Hooks (Data Modification)

```typescript
// Hook for creating communities (modern API function pattern)
export function useCreateCommunity() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();

  const mutation = useMutation({
    mutationFn: (data: CommunityData) => createCommunity(supabase, data),
    onSuccess: (newCommunity) => {
      logger.info('🏘️ API: Community created successfully', {
        communityId: newCommunity.id,
      });

      // Invalidate community lists to include new community
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      
      // Set the new community in cache
      queryClient.setQueryData(
        queryKeys.communities.byId(newCommunity.id), 
        newCommunity
      );
    },
    onError: (error) => {
      logger.error('🏘️ API: Failed to create community', { error });
    },
  });

  // Return stable function reference
  return useCallback(
    (data: CommunityData) => {
      return mutation.mutateAsync(data);
    },
    [mutation.mutateAsync]
  );
}
```

#### Authentication Hooks

```typescript
// Query hook for current user
export function useCurrentUser() {
  const supabase = useSupabase();
  const authService = createAuthService(supabase);

  return useQuery({
    queryKey: ['auth'],
    queryFn: authService.getCurrentUser,
    staleTime: STANDARD_CACHE_TIME,
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (
        error?.message?.includes('Invalid Refresh Token') ||
        error?.message?.includes('Auth session missing')
      ) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

// Mutation hook for sign in
export function useSignIn() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const authService = createAuthService(supabase);

  const mutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authService.signIn(email, password),
    onSuccess: (account) => {
      // Invalidate auth state to refetch with new session
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      queryClient.invalidateQueries({ queryKey: ['user', account.id] });
    },
  });

  return useCallback(
    (params: { email: string; password: string }) => {
      return mutation.mutateAsync(params);
    },
    [mutation.mutateAsync]
  );
}
```

**Key Architectural Principles**:

- **Single Responsibility**: Each hook serves one specific purpose (fetch communities, create community, sign in, etc.)
- **Automatic Fetching**: Query hooks automatically fetch data when mounted (standard React Query behavior)
- **Stable Function References**: Mutation hooks return stable function references using `useCallback`
- **Focused Caching**: Each hook manages its own cache keys and invalidation logic
- **Parameter-based Filtering**: Query hooks accept optional filters/parameters for dynamic behavior
- **Error Handling**: Built-in error logging and retry logic where appropriate
- **Type Safety**: Full TypeScript support with proper return types and parameter validation

**Benefits**:

- **Performance**: Components only subscribe to the data they need
- **Tree Shaking**: Unused hooks can be eliminated from bundles
- **Consistency**: Follows standard React Query and React Hooks patterns
- **Composability**: Hooks can be easily combined in components
- **Testability**: Each hook can be tested in isolation
- **Maintainability**: Clear separation of concerns between queries and mutations

### File Organization

```
feature/
├── hooks/           # Public API - single-purpose hooks
│   ├── index.ts                    # Re-export all hooks
│   ├── useCommunities.ts          # Query hook for communities list
│   ├── useCommunity.ts            # Query hook for single community
│   ├── useCreateCommunity.ts      # Mutation hook for creating
│   ├── useUpdateCommunity.ts      # Mutation hook for updating
│   ├── useDeleteCommunity.ts      # Mutation hook for deleting
│   ├── useJoinCommunity.ts        # Mutation hook for joining
│   └── useLeaveCommunity.ts       # Mutation hook for leaving
├── api/             # API functions (modern pattern)
│   ├── index.ts                    # Re-export all API functions
│   ├── fetchCommunities.ts        # Fetch communities list
│   ├── fetchCommunityById.ts      # Fetch single community
│   ├── createCommunity.ts         # Create community
│   ├── updateCommunity.ts         # Update community
│   ├── deleteCommunity.ts         # Delete community
│   ├── joinCommunity.ts           # Join community
│   └── leaveCommunity.ts          # Leave community
├── services/        # Service factories (legacy pattern, auth & conversations)
│   └── community.service.ts
├── transformers/    # Data transformation logic
│   └── communityTransformer.ts
└── index.ts         # Feature exports
```

**Architecture Migration Notes**:
- **In Progress**: Migration from `services/` pattern to `api/` function pattern
- **Completed**: Migration from monolithic hooks to single-purpose hook pattern
- **Current Structure**: Most business logic in API functions, some legacy services remain
- **Hook Pattern**: Each hook serves a single purpose following React best practices
- **Transformation Logic**: Moved to dedicated transformer files for consistency
- **Legacy**: `services/` directories remain in auth and conversations features

## Data Layer Architecture

### API Function Architecture

The platform uses an API function architecture where each domain entity has:

1. **API Functions**: Direct functions for business logic and data access (modern pattern)
2. **Service Layer**: Legacy service factories for some features (auth, conversations)
3. **Transformer Layer**: Consistent data transformation patterns
4. **Hook Layer**: React Query integration and state management

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

1. **Create API Functions** (preferred) or **Service Layer** (legacy)
   - **API Functions**: Direct functions accepting Supabase client as first parameter
   - **Service Layer**: Factory function accepting Supabase client (legacy pattern)
   - Use transformers for validation and transformation
   - Add proper error handling and logging

2. **Create Transformer Layer**
   - `toDomainX()` functions for full objects
   - `toXInfo()` functions for lightweight lists
   - `forDbInsert()` and `forDbUpdate()` functions

3. **Create Single-Purpose Hooks**
   - Individual hooks for each operation (useFeatures, useFeature, useCreateFeature, etc.)
   - Use API functions or services as needed
   - Implement React Query patterns with proper cache management

4. **Add Tests (Critical Requirements)**
   - **Unit Tests**: Follow dependency injection mocking patterns (mock at config level)
   - **Test Real Code**: Use real API functions/services, transformers, and hooks with mocked external dependencies
   - **Avoid Over-Mocking**: Don't mock platform code when testing platform functionality
   - **Use Mock Factories**: Leverage `createMock*` utilities for consistent test data
   - **Test Coverage**: Ensure both success and error paths are covered
   - **Integration Tests**: Add for critical user workflows with real Supabase connections

5. **Update Exports**
   - Export hooks from feature index.ts
   - Export API functions from api/index.ts
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
// 1. Create API functions (api/entity.ts) - Preferred approach
export async function fetchEntities(
  supabase: SupabaseClient<Database>
): Promise<EntityInfo[]> {
  const { data, error } = await supabase.from("entities").select("*");
  if (error) throw error;
  return (data || []).map(toEntityInfo);
}

export async function createEntity(
  supabase: SupabaseClient<Database>,
  data: EntityData
): Promise<Entity> {
  const insertData = forDbInsert(data);
  const { data: result, error } = await supabase
    .from("entities")
    .insert(insertData)
    .single();
  if (error) throw error;
  return toDomainEntity(result);
}

// 2. Create transformer (transformers/entityTransformer.ts)
export const toEntityInfo = (row: DbRow): EntityInfo => ({
  id: row.id,
  name: row.name,
  ownerId: row.owner_id,
  createdAt: new Date(row.created_at),
});

// 3. Create individual hooks (hooks/useEntities.ts, useCreateEntity.ts, etc.)
export function useEntities(filters?: EntityFilter) {
  const supabase = useSupabase();

  return useQuery({
    queryKey: filters 
      ? queryKeys.entities.filtered(filters)
      : queryKeys.entities.all,
    queryFn: () => fetchEntities(supabase, filters),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateEntity() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();

  const mutation = useMutation({
    mutationFn: (data: EntityData) => createEntity(supabase, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entities"] });
    },
  });

  return useCallback(
    (data: EntityData) => mutation.mutateAsync(data),
    [mutation.mutateAsync]
  );
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