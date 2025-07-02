# Belong Network Platform Usage Guide

This document explains how to use the Belong Network platform in your application. This is a TypeScript data layer built with React Query and Supabase for hyper-local community applications.

## Table of Contents

1. [Overview](#overview)
2. [Package Structure](#package-structure)
3. [Installation & Setup](#installation--setup)
4. [API Patterns](#api-patterns)
5. [Best Practices](#best-practices)
6. [Available Hooks](#available-hooks)

## Overview

The Belong Network platform is a reusable data layer that provides React hooks for authentication, communities, resources, events, and user management. It follows a provider-based architecture where you inject your own Supabase configuration.

### Tech Stack

- **Runtime**: React 18, TypeScript
- **Data Fetching**: TanStack Query (React Query) v5
- **Database**: Supabase (PostgreSQL + PostGIS for spatial data)

## Package Structure

### @belongnetwork/types
Shared TypeScript type definitions and database schema types.

### @belongnetwork/core
Shared utilities, configuration, and client creation.

### @belongnetwork/platform
React Query hooks and data layer implementation.

## Installation & Setup

### 1. Install the package

```bash
npm install @belongnetwork/platform
```

### 2. Set up providers

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

### 3. Use the hooks

```typescript
import { useCommunities } from '@belongnetwork/platform';

function CommunityList() {
  const { data: communities, isLoading, error } = useCommunities();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {communities?.map(community => (
        <div key={community.id}>{community.name}</div>
      ))}
    </div>
  );
}
```

## API Patterns

### Authentication

```typescript
import { 
  useCurrentUser, 
  useSignIn, 
  useSignOut, 
  useSignUp,
  useUpdateProfile 
} from '@belongnetwork/platform';

function AuthExample() {
  const { data: currentUser, isLoading } = useCurrentUser();
  const signIn = useSignIn();
  const signOut = useSignOut();
  const signUp = useSignUp();

  const handleSignIn = async () => {
    try {
      await signIn({
        email: 'user@example.com',
        password: 'password'
      });
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

  const handleSignUp = async () => {
    try {
      await signUp({
        email: 'user@example.com',
        password: 'password',
        firstName: 'John',
        lastName: 'Doe'
      });
    } catch (error) {
      console.error('Sign up failed:', error);
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {currentUser ? (
        <>
          <p>Welcome, {currentUser.firstName}!</p>
          <button onClick={() => signOut()}>Sign Out</button>
        </>
      ) : (
        <div>
          <button onClick={handleSignIn}>Sign In</button>
          <button onClick={handleSignUp}>Sign Up</button>
        </div>
      )}
    </div>
  );
}
```

### Data Fetching

```typescript
import { 
  useCommunities, 
  useCommunity,
  useResources, 
  useResource,
  useCreateResource,
  useUpdateResource,
  useDeleteResource 
} from '@belongnetwork/platform';

function DataFetchingExample() {
  // Query hooks for fetching data
  const { data: communities, isLoading: communitiesLoading } = useCommunities();
  const { data: resources, isLoading: resourcesLoading } = useResources({ 
    communityId: "abc123" 
  });
  const { data: community } = useCommunity("abc123");
  const { data: resource } = useResource("def456");

  // Mutation hooks for data modification
  const createResource = useCreateResource();
  const updateResource = useUpdateResource();
  const deleteResource = useDeleteResource();

  const handleCreateResource = async () => {
    try {
      await createResource({
        title: "Garden Tools",
        type: "offer",
        category: "tools",
        communityId: "abc123",
      });
    } catch (error) {
      console.error('Failed to create resource:', error);
    }
  };

  const handleUpdateResource = async () => {
    try {
      await updateResource({
        id: "def456",
        title: "Updated Garden Tools",
      });
    } catch (error) {
      console.error('Failed to update resource:', error);
    }
  };

  const handleDeleteResource = async () => {
    try {
      await deleteResource("def456");
    } catch (error) {
      console.error('Failed to delete resource:', error);
    }
  };

  if (communitiesLoading || resourcesLoading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Communities</h2>
      {communities?.map(community => (
        <div key={community.id}>{community.name}</div>
      ))}

      <h2>Resources</h2>
      {resources?.map(resource => (
        <div key={resource.id}>{resource.title}</div>
      ))}

      <button onClick={handleCreateResource}>Create Resource</button>
      <button onClick={handleUpdateResource}>Update Resource</button>
      <button onClick={handleDeleteResource}>Delete Resource</button>
    </div>
  );
}
```

### Single-Purpose Hook Pattern

All hooks follow React best practices with single-purpose design:

```typescript
// Query hooks - automatic data fetching
const { data: communities, isLoading, error } = useCommunities(filters?);
const { data: community } = useCommunity(id);
const { data: resources } = useResources(filters?);
const { data: resource } = useResource(id);

// Mutation hooks - return stable function references
const createCommunity = useCreateCommunity();
const updateCommunity = useUpdateCommunity();
const deleteCommunity = useDeleteCommunity();
const joinCommunity = useJoinCommunity();
const leaveCommunity = useLeaveCommunity();

// Usage
await createCommunity({ name: "New Community", ... });
await updateCommunity({ id: "123", name: "Updated Name" });
await deleteCommunity("123");
```

**Key Benefits:**
- **React Best Practices** - Each hook has a single, clear purpose
- **Automatic Fetching** - Query hooks fetch data when components mount
- **Performance** - Components only subscribe to data they need
- **Tree Shaking** - Unused hooks are eliminated from bundles
- **Stable References** - Mutation hooks return stable function references
- **Type Safety** - Full TypeScript support with proper return types

**Hook Categories:**
| Hook Type | Purpose | Returns | Example |
|-----------|---------|---------|---------|
| Query (List) | Fetch multiple items | `{ data: Entity[], isLoading, error }` | `useCommunities()` |
| Query (Single) | Fetch single item | `{ data: Entity, isLoading, error }` | `useCommunity(id)` |
| Mutation | Modify data | `(params) => Promise<Entity>` | `useCreateCommunity()` |

## Best Practices

### 1. Error Handling

```typescript
function ResourceForm() {
  const createResource = useCreateResource();
  const { data: resources, error: fetchError } = useResources();

  const handleSubmit = async (data: ResourceData) => {
    try {
      await createResource(data);
      toast.success("Resource created!");
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (fetchError) {
    return <ErrorMessage error={fetchError} />;
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
    </form>
  );
}
```

### 2. Loading States

```typescript
function CommunityPage({ id }: { id: string }) {
  const { data: community, isLoading, error } = useCommunity(id);

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;
  if (!community) return <NotFound />;

  return <CommunityDetails community={community} />;
}

// For list data with automatic fetching
function CommunityList() {
  const { data: communities, isLoading, error } = useCommunities();

  if (isLoading) return <div>Loading communities...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {communities?.map(community => (
        <CommunityCard key={community.id} community={community} />
      ))}
    </div>
}
```

### 3. Optimistic Updates

The platform handles optimistic updates internally for better UX. Your UI will update immediately while mutations are in progress.

### 4. Type Safety

All hooks and functions are fully typed. Use the exported types:

```typescript
import type { Community, Resource, User } from "@belongnetwork/platform";

interface Props {
  community: Community;
  resources: Resource[];
  currentUser: User;
}
```

## Available Hooks

### Authentication Hooks

#### `useCurrentUser()`
Query hook for current authenticated user.

**Returns**: `{ data: User | null, isLoading: boolean, error: Error | null }`

#### `useSignIn()`
Mutation hook for user sign in.

**Returns**: `(credentials: { email: string; password: string }) => Promise<Account>`

#### `useSignUp()`
Mutation hook for user registration.

**Returns**: `(userData: { email: string; password: string; firstName: string; lastName?: string }) => Promise<Account>`

#### `useSignOut()`
Mutation hook for user sign out.

**Returns**: `() => Promise<void>`

#### `useUpdateProfile()`
Mutation hook for updating user profile.

**Returns**: `(updates: Partial<UserData>) => Promise<User>`

### Community Hooks

#### `useCommunities(filters?: CommunityFilter)`
Query hook for fetching communities list.

**Returns**: `{ data: CommunityInfo[], isLoading: boolean, error: Error | null }`

#### `useCommunity(id: string)`
Query hook for fetching single community.

**Returns**: `{ data: Community | null, isLoading: boolean, error: Error | null }`

#### `useCreateCommunity()`
Mutation hook for creating communities.

**Returns**: `(data: CommunityData) => Promise<Community>`

#### `useUpdateCommunity()`
Mutation hook for updating communities.

**Returns**: `(data: { id: string } & Partial<CommunityData>) => Promise<Community>`

#### `useDeleteCommunity()`
Mutation hook for deleting communities.

**Returns**: `(id: string) => Promise<void>`

#### `useJoinCommunity()`
Mutation hook for joining communities.

**Returns**: `(communityId: string) => Promise<void>`

#### `useLeaveCommunity()`
Mutation hook for leaving communities.

**Returns**: `(communityId: string) => Promise<void>`

### Resource Hooks

#### `useResources(filters?: ResourceFilter)`
Query hook for fetching resources list.

**Returns**: `{ data: ResourceInfo[], isLoading: boolean, error: Error | null }`

#### `useResource(id: string)`
Query hook for fetching single resource.

**Returns**: `{ data: Resource | null, isLoading: boolean, error: Error | null }`

#### `useCreateResource()`
Mutation hook for creating resources.

**Returns**: `(data: ResourceData) => Promise<Resource>`

#### `useUpdateResource()`
Mutation hook for updating resources.

**Returns**: `(data: { id: string } & Partial<ResourceData>) => Promise<Resource>`

#### `useDeleteResource()`
Mutation hook for deleting resources.

**Returns**: `(id: string) => Promise<void>`

### Event Hooks

#### `useEvents(filters?: EventFilter)`
Query hook for fetching events list.

**Returns**: `{ data: EventInfo[], isLoading: boolean, error: Error | null }`

#### `useEvent(id: string)`
Query hook for fetching single event.

**Returns**: `{ data: Event | null, isLoading: boolean, error: Error | null }`

#### `useCreateEvent()`
Mutation hook for creating events.

**Returns**: `(data: EventData) => Promise<Event>`

#### `useUpdateEvent()`
Mutation hook for updating events.

**Returns**: `(data: { id: string } & Partial<EventData>) => Promise<Event>`

#### `useDeleteEvent()`
Mutation hook for deleting events.

**Returns**: `(id: string) => Promise<void>`

### User Hooks

#### `useUsers(filters?: UserFilter)`
Query hook for fetching users list.

**Returns**: `{ data: UserInfo[], isLoading: boolean, error: Error | null }`

#### `useUser(id: string)`
Query hook for fetching single user.

**Returns**: `{ data: User | null, isLoading: boolean, error: Error | null }`

### Shoutout Hooks

#### `useShoutouts(filters?: ShoutoutFilter)`
Query hook for fetching shoutouts list.

**Returns**: `{ data: ShoutoutInfo[], isLoading: boolean, error: Error | null }`

#### `useShoutout(id: string)`
Query hook for fetching single shoutout.

**Returns**: `{ data: Shoutout | null, isLoading: boolean, error: Error | null }`

#### `useCreateShoutout()`
Mutation hook for creating shoutouts.

**Returns**: `(data: ShoutoutData) => Promise<Shoutout>`

#### `useUpdateShoutout()`
Mutation hook for updating shoutouts.

**Returns**: `(data: { id: string } & Partial<ShoutoutData>) => Promise<Shoutout>`

#### `useDeleteShoutout()`
Mutation hook for deleting shoutouts.

**Returns**: `(id: string) => Promise<void>`

---

For internal architecture details and contributing guidelines, see [ARCHITECTURE.md](./ARCHITECTURE.md).