# Belong Network Platform Architecture

This document describes the architecture of the Belong Network platform, a TypeScript monorepo for building hyper-local community applications with resource sharing, event management, and social features.

## Table of Contents

1. [Overview](#overview)
2. [Package Structure](#package-structure)

### For Platform Consumers (Using the Platform)
3. [Consumer Integration Guide](#consumer-integration-guide)
4. [Consumer API Patterns](#consumer-api-patterns)
5. [Consumer Best Practices](#consumer-best-practices)

### For Platform Developers (Building the Platform)
6. [Internal Architecture Principles](#internal-architecture-principles)
7. [Internal Implementation Patterns](#internal-implementation-patterns)
8. [Internal Data Layer Architecture](#internal-data-layer-architecture)
9. [Internal Testing Patterns](#internal-testing-patterns)
10. [Contributing Guidelines](#contributing-guidelines)

## Overview

The Belong Network platform is a reusable data layer built with React Query and Supabase. It follows a provider-based architecture where consuming applications inject their own Supabase configuration, making the platform adaptable to different Supabase projects.

### Who Should Read What

- **If you're USING the platform in your app**: Read Part 1 - it covers installation, setup, and how to use the hooks and components.
- **If you're DEVELOPING the platform itself**: Read Part 2 - it covers internal architecture, patterns, and contribution guidelines.

### Tech Stack

- **Runtime**: React 18, TypeScript
- **Data Fetching**: TanStack Query (React Query) v5
- **Database**: Supabase (PostgreSQL + PostGIS for spatial data)
- **Build**: Vite with pnpm workspaces
- **Testing**: Vitest with jsdom and Testing Library

## Package Structure

The platform consists of three core packages:

### @belongnetwork/types

**Purpose**: Shared TypeScript type definitions and Zod schemas

```
packages/types/
├── src/
│   ├── database.ts    # Generated Supabase database types
│   ├── schemas/       # Zod schemas (source of truth)
│   │   ├── user.schema.ts
│   │   ├── community.schema.ts
│   │   ├── resource.schema.ts
│   │   └── index.ts
│   ├── generated/     # Auto-generated types from schemas
│   │   └── index.ts
│   └── index.ts       # Main export
```

**Key Responsibilities**:

- Define all domain schemas using Zod
- Auto-generate TypeScript types from schemas
- Provide runtime validation for all data
- Handle automatic transformations between DB and domain formats

#### Current Transformer Architecture

The platform currently uses manual transformer functions for data conversion between database and domain objects:

```typescript
// transformers/communityTransformer.ts
export function toDomainCommunity(
  dbCommunity: CommunityRow & { organizer: ProfileRow }
): Community {
  const coords = dbCommunity.center ? parsePostGisPoint(dbCommunity.center) : undefined;
  
  return {
    id: dbCommunity.id,
    name: dbCommunity.name,
    description: dbCommunity.description ?? undefined,
    organizerId: dbCommunity.organizer_id,
    center: coords,
    createdAt: new Date(dbCommunity.created_at),
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

```
packages/core/
├── src/
│   ├── config/
│   │   ├── client.ts      # BelongClient factory
│   │   ├── supabase.ts    # Supabase client wrapper
│   │   └── mapbox.ts      # Mapbox client wrapper
│   └── utils/
│       ├── logger.ts      # Centralized logging
│       └── distance.ts    # Geospatial utilities
```

**Key Responsibilities**:

- Create configured client instances (Supabase, Mapbox)
- Provide shared utilities (logging, geospatial calculations)
- Handle external service configuration

### @belongnetwork/platform (API Package)

**Purpose**: React Query hooks and data layer implementation

```
packages/api/
├── src/
│   ├── auth/
│   │   ├── hooks/         # Authentication hooks
│   │   ├── services/      # Auth service layer
│   │   └── providers/     # BelongProvider component
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
│   ├── thanks/
│   │   ├── hooks/         # Thanks data hooks
│   │   ├── services/      # Thanks service layer
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

# PART 1: FOR PLATFORM CONSUMERS

## Consumer Integration Guide

### Setting Up the Platform

To use the Belong Network platform in your application:

1. **Install the package**:
```bash
npm install @belongnetwork/platform
```

2. **Set up providers**:
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BelongProvider } from '@belongnetwork/platform';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,    // 10 minutes
    }
  }
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BelongProvider
        config={{
          supabaseUrl: process.env.REACT_APP_SUPABASE_URL,
          supabaseAnonKey: process.env.REACT_APP_SUPABASE_ANON_KEY,
          mapboxPublicToken: process.env.REACT_APP_MAPBOX_TOKEN
        }}
      >
        <YourApp />
      </BelongProvider>
    </QueryClientProvider>
  );
}
```

3. **Use the hooks**:
```typescript
import { useCommunities, useCreateCommunity } from '@belongnetwork/platform';

function CommunityList() {
  const { data: communities, isLoading } = useCommunities();
  const createCommunity = useCreateCommunity();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {communities?.map(community => (
        <div key={community.id}>{community.name}</div>
      ))}
    </div>
  );
}
```

## Consumer API Patterns

### Authentication

```typescript
import { useAuth } from '@belongnetwork/platform';

function AuthExample() {
  const { 
    currentUser, 
    isAuthenticated,
    isLoading,
    signIn, 
    signUp, 
    signOut,
    updateProfile
  } = useAuth();

  const handleSignIn = async () => {
    await signIn.mutateAsync({ 
      email: 'user@example.com', 
      password: 'password' 
    });
  };

  const handleSignUp = async () => {
    await signUp.mutateAsync({
      email: 'user@example.com',
      password: 'password',
      firstName: 'John',
      lastName: 'Doe'
    });
  };

  const handleUpdateProfile = async () => {
    await updateProfile.mutateAsync({
      firstName: 'Jane',
      lastName: 'Smith'
    });
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {isAuthenticated ? (
        <>
          <p>Welcome, {currentUser?.firstName}!</p>
          <button onClick={() => signOut.mutate()}>Sign Out</button>
          <button onClick={handleUpdateProfile}>Update Profile</button>
        </>
      ) : (
        <>
          <button onClick={handleSignIn}>Sign In</button>
          <button onClick={handleSignUp}>Sign Up</button>
        </>
      )}
    </div>
  );
}
```

### Data Fetching

```typescript
// Using the consolidated hooks
const communities = useCommunities();
const resources = useResources();
const events = useEvents();

// Fetching lists
const communityList = communities.communities;
const resourceList = resources.resources({ communityId: 'abc123' });
const eventList = events.events({ communityId: 'abc123' });

// Fetching single items
const { data: community } = communities.getCommunity('abc123');
const { data: resource } = resources.getResource('def456');
const { data: event } = events.getEvent('ghi789');

// Using mutations
await resources.create({
  title: 'Garden Tools',
  type: 'offer',
  category: ResourceCategory.TOOLS,
  communityId: 'abc123'
});

await resources.update('def456', {
  title: 'Updated Garden Tools'
});

await resources.delete('def456');
```

## Consumer Best Practices

### 1. Error Handling

```typescript
function ResourceForm() {
  const resources = useResources();

  const handleSubmit = async (data: ResourceData) => {
    try {
      await resources.create(data);
      toast.success('Resource created!');
    } catch (error) {
      toast.error(error.message);
    }
  };
}
```

### 2. Loading States

```typescript
function CommunityPage() {
  const { data: community, isLoading, error } = useCommunity(id);

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;
  if (!community) return <NotFound />;

  return <CommunityDetails community={community} />;
}
```

### 3. Optimistic Updates

The platform handles optimistic updates internally for better UX. Your UI will update immediately while the mutation is in progress.

### 4. Type Safety

All hooks and functions are fully typed. Use the exported types:

```typescript
import type { Community, Resource, User } from '@belongnetwork/platform';

interface Props {
  community: Community;
  resources: Resource[];
  currentUser: User;
}
```

## Available Hooks Reference

### Consolidated Entity Hooks

Each entity provides a single hook that returns all operations:

#### `useAuth()`
Returns an object with:
- **State**:
  - `currentUser` - Current authenticated user or null
  - `isAuthenticated` - Boolean auth state
  - `isLoading` - Loading state
- **Operations**:
  - `signIn(credentials)` - Sign in mutation
  - `signUp(userData)` - Sign up mutation
  - `signOut()` - Sign out mutation
  - `updateProfile(updates)` - Update current user profile mutation

#### `useCommunities()`
Returns an object with:
- **Queries**:
  - `communities` - List of communities
  - `getCommunity(id)` - Get single community by ID
  - `getMemberships(communityId)` - List community members
  - `getUserMemberships(userId)` - List user's communities
- **Mutations**:
  - `create(data)` - Create new community
  - `update(id, data)` - Update community
  - `delete(id)` - Delete community
  - `join(communityId)` - Join community
  - `leave(communityId)` - Leave community

#### `useResources()`
Returns an object with:
- **Queries**:
  - `resources` - List of resources (accepts filter)
  - `getResource(id)` - Get single resource by ID
- **Mutations**:
  - `create(data)` - Create new resource
  - `update(id, data)` - Update resource
  - `delete(id)` - Delete resource

#### `useEvents()`
Returns an object with:
- **Queries**:
  - `events` - List of events (accepts filter)
  - `getEvent(id)` - Get single event by ID
  - `getAttendees(eventId)` - List event attendees
- **Mutations**:
  - `create(data)` - Create new event
  - `update(id, data)` - Update event
  - `delete(id)` - Delete event
  - `join(eventId)` - Join event
  - `leave(eventId)` - Leave event

#### `useThanks()`
Returns an object with:
- **Queries**:
  - `thanks` - List of thanks (accepts filter)
  - `getThank(id)` - Get single thank by ID
- **Mutations**:
  - `create(data)` - Create new thanks
  - `update(id, data)` - Update thanks
  - `delete(id)` - Delete thanks

#### `useUsers()`
Returns an object with:
- **Queries**:
  - `users` - List of users (accepts filter)
  - `getUser(id)` - Get single user by ID
- **Mutations**:
  - `update(id, data)` - Update user

---

# PART 2: FOR PLATFORM DEVELOPERS

## Internal Architecture Principles

### 1. Provider-Based Architecture

The platform uses dependency injection through React Context:

```typescript
// Internal: How we structure the provider
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

// Internal: How hooks access the injected client
export function useSupabase() {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error('useSupabase must be used within BelongProvider');
  }
  return context.supabase;
}
```

### 2. Dependency Injection Pattern

All services are factories that accept their dependencies:

```typescript
// Service factory pattern
export const createAuthService = (supabase: SupabaseClient) => ({
  async signIn(email: string, password: string) {
    // Implementation using injected supabase client
  },
});

// Hook using the service
export function useSignIn() {
  const supabase = useSupabase(); // Get injected client
  const authService = createAuthService(supabase);

  return useMutation({
    mutationFn: authService.signIn,
  });
}
```

### 3. Type Safety Requirements

- No `any` types allowed
- Use discriminated unions for complex states
- Leverage generated database types for consistency
- All functions must have explicit return types

## Internal Implementation Patterns

### Service Layer Pattern

Services encapsulate business logic and Supabase interactions:

```typescript
// services/community.service.ts
export const createCommunityService = (supabase: SupabaseClient<Database>) => ({
  async fetchCommunities(options?: {
    includeDeleted?: boolean;
  }): Promise<CommunityInfo[]> {
    let query = supabase
      .from('communities')
      .select('*')
      .order('created_at', { ascending: false });

    if (!options?.includeDeleted) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(toCommunityInfo);
  },
});
```

### Current Data Transformation Patterns

Manual transformer functions handle all data conversions:

```typescript
// services/community.service.ts
import { toDomainCommunity, toCommunityInfo, forDbInsert } from '../transformers/communityTransformer';

export const createCommunityService = (supabase: SupabaseClient<Database>) => ({
  async fetchCommunities(): Promise<CommunityInfo[]> {
    const { data, error } = await supabase
      .from('communities')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      logger.error('Failed to fetch communities', { error });
      throw error;
    }
    
    return (data || []).map(toCommunityInfo);
  },
  
  async fetchCommunityById(id: string): Promise<Community | null> {
    const { data, error } = await supabase
      .from('communities')
      .select(`
        *,
        organizer:profiles!organizer_id(*)
      `)
      .eq('id', id)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      logger.error('Failed to fetch community', { id, error });
      throw error;
    }
    
    return toDomainCommunity(data);
  },
  
  async createCommunity(data: CommunityData): Promise<Community> {
    const { data: result, error } = await supabase
      .from('communities')
      .insert(forDbInsert(data))
      .select(`
        *,
        organizer:profiles!organizer_id(*)
      `)
      .single();
      
    if (error) {
      logger.error('Failed to create community', { data, error });
      throw error;
    }
    
    return toDomainCommunity(result);
  }
});
```

#### Transformation Utilities

Common utilities for field transformation:

```typescript
// utils/index.ts
export function parsePostGisPoint(postGisString: string): Coordinates {
  const match = postGisString.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
  if (!match) throw new Error('Invalid PostGIS point format');
  return { lng: parseFloat(match[1]), lat: parseFloat(match[2]) };
}

export function toPostGisPoint(coords: Coordinates): string {
  return `POINT(${coords.lng} ${coords.lat})`;
}
```

### Hook Implementation Pattern

Consolidated hook pattern for each entity:

```typescript
// hooks/useCommunities.ts
export function useCommunities() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const service = createCommunityService(supabase);

  // List query
  const communitiesQuery = useQuery<CommunityInfo[], Error>({
    queryKey: queryKeys.communities.all,
    queryFn: service.fetchCommunities,
    staleTime: 5 * 60 * 1000,
  });

  // Single item query function
  const getCommunity = (id: string) => {
    return useQuery<Community | null, Error>({
      queryKey: queryKeys.communities.byId(id),
      queryFn: () => service.fetchCommunityById(id),
      enabled: !!id,
    });
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: service.createCommunity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.communities.all });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CommunityData> }) => 
      service.updateCommunity(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.communities.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.communities.byId(id) });
    },
  });

  return {
    // Queries
    communities: communitiesQuery.data,
    isLoading: communitiesQuery.isLoading,
    error: communitiesQuery.error,
    getCommunity,
    
    // Mutations
    create: createMutation.mutateAsync,
    update: (id: string, data: Partial<CommunityData>) => 
      updateMutation.mutateAsync({ id, data }),
    
    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}
```

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

## Internal Provider Implementation

```typescript
// providers/BelongProvider.tsx
export function BelongProvider({ children, config }: BelongProviderProps) {
  // Create client from config
  const client = useMemo(() => createBelongClient(config), [config]);

  return (
    <ClientContext.Provider value={client}>
      <BelongContextProvider
        config={{
          supabaseUrl: process.env.VITE_SUPABASE_URL,
          supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY,
          mapboxPublicToken: process.env.VITE_MAPBOX_PUBLIC_TOKEN,
        }}>
        {children}
      </BelongContextProvider>
    </ClientContext.Provider>
  );
}

// Internal hook to access Supabase
export function useSupabase() {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error('useSupabase must be used within BelongProvider');
  }
  return context.supabase;
}
```

### Internal Auth State Management

How the provider manages auth state internally:

```typescript
useEffect(() => {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN') {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      queryClient.invalidateQueries({
        queryKey: ['user', session.user.id],
      });
    } else if (event === 'SIGNED_OUT') {
      queryClient.removeQueries({ queryKey: ['auth'] });
      queryClient.removeQueries({ queryKey: ['users'] });
    }
  });

  return () => subscription.unsubscribe();
}, [supabase, queryClient]);
```

## Internal Data Layer Architecture

### Service-Based Architecture

The platform uses a service-based architecture where each domain entity has:

1. **Service Layer**: Centralized business logic and data access
2. **Transformer Layer**: Consistent data transformation patterns
3. **Hook Layer**: React Query integration and state management

### Data Fetching Strategies

The platform uses two main data fetching strategies:

#### 1. Cache Assembly Pattern

Default pattern, used for: Resources, Events, Thanks - where related data is often already cached

```typescript
// Service method using cache assembly
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
// Service method using SQL joins
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

### Service Layer Implementation

Each service encapsulates all business logic for its domain:

```typescript
// services/community.service.ts
export const createCommunityService = (supabase: SupabaseClient<Database>) => ({
  async fetchCommunities(options?: CommunityFetchOptions): Promise<CommunityInfo[]> {
    // Implementation with proper error handling
  },
  
  async fetchCommunityById(id: string): Promise<Community | null> {
    // Implementation with cache integration
  },
  
  async createCommunity(data: CommunityCreate): Promise<Community> {
    // Implementation with validation and transformation
  },
  
  // ... other CRUD operations
});
```

### Query Key Convention

Centralized query key management in `shared/queryKeys.ts`:

```typescript
// shared/queryKeys.ts
export const queryKeys = {
  auth: ['auth'],
  users: {
    all: ['users'],
    byId: (id: string) => ['user', id],
    search: (term: string) => ['users', 'search', term],
  },
  communities: {
    all: ['communities'],
    byId: (id: string) => ['community', id],
    memberships: (communityId: string) => ['community', communityId, 'memberships'],
    userMemberships: (userId: string) => ['user', userId, 'memberships'],
  },
  resources: {
    all: ['resources'],
    byId: (id: string) => ['resource', id],
    byCommunity: (communityId: string) => ['resources', 'community', communityId],
  },
  events: {
    all: ['events'],
    byId: (id: string) => ['event', id],
    attendees: (eventId: string) => ['event', eventId, 'attendees'],
    userAttendances: (userId: string) => ['user', userId, 'attendances'],
  },
  thanks: {
    all: ['thanks'],
    byId: (id: string) => ['thanks', id],
    byCommunity: (communityId: string) => ['thanks', 'community', communityId],
  },
};
```

This centralized approach ensures:
- Consistent cache invalidation patterns
- Easier maintenance and updates
- Better query dependency management
- Reduced cache key duplication

### Internal Cache Management

How the platform manages React Query internally:

```typescript
// Recommended QueryClient configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error) => {
        // Don't retry on auth errors
        if (error?.message?.includes('Invalid Refresh Token')) {
          return false;
        }
        return failureCount < 2;
      },
    },
  },
});
```

### Internal Optimistic Update Implementation

How to implement optimistic updates in platform code:

```typescript
const mutation = useMutation({
  mutationFn: updateResource,
  onMutate: async (newData) => {
    // Cancel in-flight queries
    await queryClient.cancelQueries(['resource', newData.id]);

    // Save current data
    const previousData = queryClient.getQueryData(['resource', newData.id]);

    // Optimistically update
    queryClient.setQueryData(['resource', newData.id], newData);

    return { previousData };
  },
  onError: (err, newData, context) => {
    // Rollback on error
    queryClient.setQueryData(['resource', newData.id], context.previousData);
  },
});
```

## Internal Testing Patterns

### Platform Testing Principles

1. **Flexible Mocking Strategy**: Mock external dependencies and platform code when it improves test clarity and maintainability

```typescript
// ✅ Good - Mock Supabase for unit tests
vi.mock('@supabase/supabase-js');

// ✅ Also Good - Mock platform functions when testing components in isolation
vi.mock('../impl/fetchUsers');

// ✅ Good - Mock hooks when testing components
vi.mock('@belongnetwork/platform', () => ({
  useCommunities: () => ({
    communities: mockCommunities,
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  })
}));
```

2. **Use Factory Functions for Test Data**:

```typescript
// Use createMock* utilities
const mockUser = createMockUser();
```

Only pass override parameters to createMock\* functions if absolutely necessary.

3. **Test Behavior, Not Implementation**:

```typescript
// Test consolidated hook behavior
it('should provide community operations', async () => {
  const { result } = renderHook(() => useCommunities());

  // Test query
  await waitFor(() => {
    expect(result.current.communities).toHaveLength(2);
    expect(result.current.communities[0]).toHaveProperty('organizerId');
  });

  // Test mutation
  await act(async () => {
    await result.current.create({
      name: 'Test Community',
      organizerId: 'user123'
    });
  });

  expect(result.current.isCreating).toBe(false);
});
```

### Integration Testing

Keep integration tests separate with real Supabase connections:

```typescript
// vitest.integration.config.ts
export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.{ts,tsx}'],
    setupFiles: ['./tests/integration/setup.ts'],
    // Use real environment, no mocks
  },
});
```

### Testing Best Practices

#### Unit Testing Components

```typescript
// Mock the consolidated hook for component tests
vi.mock('@belongnetwork/platform', () => ({
  useCommunities: () => ({
    communities: mockCommunities,
    isLoading: false,
    error: null,
    create: mockCreate,
    update: mockUpdate,
    delete: mockDelete,
  })
}));

it('should display communities', () => {
  render(<CommunityList />);
  expect(screen.getByText('Test Community')).toBeInTheDocument();
});
```

#### Testing Hooks

```typescript
// Can mock service layer for hook tests
vi.mock('../services/community.service', () => ({
  createCommunityService: () => ({
    fetchCommunities: vi.fn().mockResolvedValue(mockCommunities),
    createCommunity: vi.fn().mockResolvedValue(mockNewCommunity),
  })
}));
```

### Common Implementation Anti-Patterns

### ❌ Centralizing Client Management

```typescript
// Bad - Don't create singleton clients
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
export default supabase;
```

### ✅ Use Dependency Injection

```typescript
// Good - Accept client as parameter
export const createService = (supabase: SupabaseClient) => ({
  // Service methods
});
```

### ❌ Direct Supabase Access in Components

```typescript
// Bad - Don't access Supabase directly
function MyComponent() {
  const handleClick = async () => {
    const { data } = await supabase.from('users').select();
  };
}
```

### ✅ Use Hooks for Data Access

```typescript
// Good - Use provided hooks
function MyComponent() {
  const { data, isLoading } = useUsers();
}
```

### ❌ Manual Cache Management

```typescript
// Bad - Don't manage cache manually
const users = localStorage.getItem('users');
```

### ✅ Rely on React Query

```typescript
// Good - Let React Query handle caching
const { data: users } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
});
```

### ❌ Inconsistent Error Handling

```typescript
// Bad - Silent failures
try {
  await fetchData();
} catch (e) {
  // Do nothing
}
```

### ✅ Proper Error Propagation

```typescript
// Good - Log and re-throw
try {
  await fetchData();
} catch (error) {
  logger.error('Failed to fetch data', { error });
  throw error;
}
```

## Contributing Guidelines

### Implementation Checklist

When adding new features to the platform:

1. **Define Schemas** in `@belongnetwork/types/schemas`

   - Create Zod schema as single source of truth
   - Auto-derive create/update schemas
   - Add DB transformation schemas
   - Export inferred TypeScript types

2. **Database Changes** (if needed)

   - Create migration using Supabase CLI
   - Apply migration to development database
   - Run integrated migration command: `pnpm migrate:apply`
   - This automatically regenerates types and validates schemas

3. **Create Service Layer**

   - Factory function accepting Supabase client
   - Use schemas for validation and transformation
   - Let Zod handle all data conversions
   - Add proper error handling for validation failures

4. **Create Consolidated Hook**

   - One hook per entity with all operations
   - Return object with queries and mutations
   - Use schema validation in mutations
   - Handle loading and error states

5. **Add Tests**

   - Unit tests can mock platform code when needed
   - Use schemas to generate test data
   - Test schema validations
   - Integration tests for critical paths

6. **Update Exports**
   - Export schemas from schemas/index.ts
   - Export hook from feature index.ts
   - Update package exports if needed

### Example: Adding a New Entity

```typescript
// 1. Create service (services/entity.service.ts)
export const createEntityService = (supabase: SupabaseClient<Database>) => ({
  async fetchEntities(): Promise<EntityInfo[]> {
    const { data, error } = await supabase.from('entities').select('*');
    if (error) throw error;
    return (data || []).map(toEntityInfo);
  },
  
  async createEntity(data: EntityCreate): Promise<Entity> {
    const { data: result, error } = await supabase
      .from('entities').insert(forDbEntity(data)).select().single();
    if (error) throw error;
    return toEntity(result);
  }
});

// 2. Create transformer (transformers/entityTransformer.ts)
export const toEntityInfo = (row: DbRow): EntityInfo => ({
  id: row.id,
  name: row.name,
  ownerId: row.owner_id,
  createdAt: new Date(row.created_at)
});

// 3. Create hook (hooks/useEntities.ts)
export function useEntities() {
  const service = createEntityService(useSupabase());
  
  const entitiesQuery = useQuery({
    queryKey: queryKeys.entities.all,
    queryFn: service.fetchEntities
  });
  
  const createMutation = useMutation({
    mutationFn: service.createEntity,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.entities.all })
  });
  
  return {
    entities: entitiesQuery.data,
    create: createMutation.mutateAsync,
    isCreating: createMutation.isPending
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
  id: true, createdAt: true, updatedAt: true 
});

// Automatic DB transformations
export const CommunityDbSchema = CommunitySchema.transform(caseTransform.toSnakeCase);
export const CommunityFromDbSchema = z.any().transform(caseTransform.toCamelCase).pipe(CommunitySchema);
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
