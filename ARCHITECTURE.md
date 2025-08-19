# Belong Network Platform Architecture

This document describes the internal architecture of the Belong Network Platform for platform developers. For usage information, see [USAGE.md](./USAGE.md).

## Overview

The Belong Network Platform is a TypeScript library built with React Query and Supabase. It uses a service-based architecture with manual transformers, dependency injection, and feature-based organization.

### Tech Stack

- **Runtime**: React 18, TypeScript
- **Data Fetching**: TanStack Query (React Query) v5
- **Database**: Supabase (PostgreSQL + PostGIS for spatial data)
- **Build**: Vite
- **Testing**: Vitest with jsdom and Testing Library

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

### 2. Feature-Based Organization

```
src/features/
├── auth/              # Authentication and user sessions
│   ├── api/           # API functions
│   ├── hooks/         # React Query hooks
│   └── types/         # Type definitions
├── communities/       # Community management
├── feed/              # Feed aggregation
├── images/            # Image upload and management  
├── resources/         # Resources (offers, requests, events)
├── shoutouts/         # Recognition and appreciation
├── trust-scores/      # Trust scoring system
└── users/             # User profiles and management

Note: The agenda page aggregates data from these features
but is not a standalone platform feature.
```

#### Access Patterns

- **External users**: Must use hooks and types for all access to platform functionality
- **Internal users** (within the same feature): May use hooks or directly access the api directory
- **All other directories** (transformers, etc.): Internal to the feature and should not be accessed from outside the feature

### 3. Single-Purpose Hook Pattern

Each hook serves one specific purpose:

- **Query Hooks**: Fetch data (`useCurrentUser`, `useCommunities`)
- **Mutation Hooks**: Modify data (`useCreateResource`, `useSignIn`)

Benefits:

- Components only subscribe to data they need
- Unused hooks are eliminated from bundles
- Clear separation of concerns
- Better testability

### 4. Type System

Each feature follows a consistent 4-type pattern:

#### Entity Types

1. **Entity** (e.g., `Community`) - Full entity with all relations loaded
   - Combines `EntityInput` and `EntitySummary` with persistence fields
   - Used when displaying complete entity details
   - Example: `Community = IsPersisted<CommunityInput & CommunitySummary>`

2. **PartialEntity** (e.g., `PartialCommunity`) - Embedded reference type
   - Contains only `EntitySummary` with persistence fields
   - Used when entity is referenced by other entities
   - Example: `PartialCommunity = IsPersisted<CommunitySummary>`

3. **EntityInput** (e.g., `CommunityInput`) - User input for creates/updates
   - Contains only fields users can modify
   - Excludes system fields, relations, and computed fields
   - Example: `CommunityInput = Omit<CommunitySummary, 'memberCount' | 'organizerId' | 'organizer'> & {...}`

4. **EntitySummary** (e.g., `CommunitySummary`) - Essential fields including relations
   - Contains core fields, embedded relations (PartialUser, etc.), and computed fields
   - Internal type, not exported
   - Example: Contains `name`, `organizer: PartialUser`, `memberCount`, etc.

#### Special Type Variants

- **EntityDetail** - Alias for Entity with additional loaded relations
  - Example: `ResourceDetail = Resource & { responses?: PartialUser[] }`
  
- **EntityInfo** - Lightweight version with just IDs instead of embedded objects
  - Used for list operations where relations aren't needed
  - Example: `CommunityInfo` has `organizerId` instead of `organizer: PartialUser`

#### Type Rules

- **No optional foreign keys** in Input types - always defaults to current user
- **Computed fields** (like `memberCount`, `attendeeCount`) belong in Summary types
- **System fields** (`id`, `createdAt`, `updatedAt`) come from `IsPersisted<T>`
- **Connector entities** (like `ResourceResponse`) only contain IDs, not embedded entities
- **No `any` types** - use proper types or type assertions
- **Dynamic data** (trust levels, online status) should use separate queries

#### Cache Invalidation Strategy

- **Explicit updates** (user/community edits): Clear entire cache with `queryClient.invalidateQueries()`
- **Discovered changes**: Accept eventual consistency
- **Reasoning**: User data (names, avatars) and community data are embedded throughout the cache
- **Trade-off**: Simple invalidation over complex dependency tracking

## Implementation Patterns

### API Function Pattern

Most features use direct API functions:

```typescript
export async function fetchCommunities(
  supabase: SupabaseClient<Database>,
  filters?: CommunityFilter,
): Promise<CommunityInfo[]> {
  const { data, error } = await supabase
    .from('communities')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(toCommunityInfo);
}
```

### Hook Implementation

Query hooks with automatic data fetching:

```typescript
export function useCommunities(filters?: CommunityFilter) {
  const supabase = useSupabase();

  return useQuery({
    queryKey: filters
      ? queryKeys.communities.filtered(filters)
      : queryKeys.communities.all,
    queryFn: () => fetchCommunities(supabase, filters),
    staleTime: 5 * 60 * 1000,
  });
}
```

Mutation hooks with stable references:

```typescript
export function useCreateCommunity() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();

  const mutation = useMutation({
    mutationFn: (data: CommunityInput) => createCommunity(supabase, data),
    onSuccess: (newCommunity) => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      queryClient.setQueryData(
        queryKeys.communities.byId(newCommunity.id),
        newCommunity,
      );
    },
  });

  return useCallback(
    (data: CommunityData) => mutation.mutateAsync(data),
    [mutation.mutateAsync],
  );
}
```

### Transformer Patterns

Each entity follows consistent transformation patterns:

- **`toDomainX()`**: Database row → Domain object
- **`toXInfo()`**: Database row → Lightweight info object
- **`forDbInsert()`**: Domain data → Database insert format
- **`forDbUpdate()`**: Domain data → Database update format

Example:

```typescript
export function toDomainCommunity(
  dbRow: CommunityRow & { organizer: ProfileRow },
): Community {
  return {
    id: dbRow.id,
    name: dbRow.name,
    organizerId: dbRow.organizer_id,
    organizer: toDomainUser(dbRow.organizer),
    createdAt: new Date(dbRow.created_at),
  };
}
```

## Data Layer Architecture

### Query Key Convention

Centralized query key management:

```typescript
export const queryKeys = {
  auth: ['auth'],
  users: {
    all: ['users'],
    byId: (id: string) => ['user', id],
  },
  communities: {
    all: ['communities'],
    byId: (id: string) => ['community', id],
    memberships: (communityId: string) => [
      'community',
      communityId,
      'memberships',
    ],
  },
};
```

### Data Fetching Strategies

1. **Cache Assembly Pattern**: Assemble related data from cache
2. **SQL Joins Pattern**: Fetch related data in single query

Choose based on whether related data is typically cached.

## Testing Architecture

### Dependency Injection Testing

Mock at the configuration level for full integration testing:

```typescript
vi.mock('./config/client', () => ({
  createBelongClient: vi.fn(() => mockClientWithControlledDependencies),
}));
```

### Testing Best Practices

1. **Mock External Dependencies Only**: Supabase, external APIs
2. **Use Real Platform Code**: Services, transformers, hooks
3. **Test Behavior, Not Implementation**: Focus on outputs, not internals
4. **Use Test Data Factories**: Consistent test data generation

Example test:

```typescript
describe('useSignUp', () => {
  it('should call Supabase with correct parameters', async () => {
    const { result } = renderHook(() => useSignUp(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        email: 'test@example.com',
        password: 'password',
        firstName: 'Test',
      });
    });

    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
      options: { data: { first_name: 'Test' } },
    });
  });
});
```

## Contributing Guidelines

### Adding New Features

1. **Create API Functions**: Accept Supabase client as first parameter
2. **Create Transformers**: Follow naming conventions
3. **Create Hooks**: Single-purpose, properly typed
4. **Add Tests**: Unit tests with proper mocking strategy
5. **Update Exports**: Feature index and package exports

### Example: Adding a New Entity

```typescript
// 1. API Function
export async function fetchEntities(
  supabase: SupabaseClient<Database>,
  filters?: EntityFilter,
): Promise<EntityInfo[]> {
  const { data, error } = await supabase.from('entities').select('*');
  if (error) throw error;
  return (data || []).map(toEntityInfo);
}

// 2. Transformer
export const toEntityInfo = (row: EntityRow): EntityInfo => ({
  id: row.id,
  name: row.name,
  createdAt: new Date(row.created_at),
});

// 3. Hook
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
```

## Current Platform Features

### Core Features

- **Auth**: User authentication, registration, and session management
- **Communities**: Hyper-local community creation and membership management with spatial boundaries
- **Users**: User profiles and management
- **Resources**: Multi-purpose resource system with three types:
  - `offer` - sharing resources with the community
  - `request` - asking for help from the community  
  - `event` - community gatherings (formerly a separate events feature)
- **Shoutouts**: Recognition and appreciation system between community members
- **Trust Scores**: Community trust scoring based on user actions (creation, participation, etc.)

### Utility Features

- **Feed**: Aggregates items (resources, events, shoutouts) for display in feeds and timelines
- **Images**: Handles image upload, commit, and cleanup workflows for user-generated content

### UI Composition

- **Agenda Page**: A UI page that aggregates data from multiple platform features (resources, shoutouts, etc.) to provide a personalized view of relevant community activities

## Key Architecture Decisions

1. **Single-Purpose Hooks**: Better performance and tree-shaking
2. **Dependency Injection**: Flexible testing and configuration
3. **Feature-Based Structure**: Clear domain boundaries
4. **Manual Transformers**: Explicit data transformation
5. **Centralized Query Keys**: Consistent cache management

These decisions prioritize maintainability, testability, and performance while keeping the codebase flexible for future enhancements.
