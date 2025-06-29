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
import { useEffect, useState } from 'react';

function CommunityList() {
  const { list } = useCommunities();
  const [communityList, setCommunityList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    list().then((data) => {
      setCommunityList(data);
      setIsLoading(false);
    });
  }, [list]);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {communityList?.map(community => (
        <div key={community.id}>{community.name}</div>
      ))}
    </div>
  );
}
```

## API Patterns

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

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {isAuthenticated ? (
        <>
          <p>Welcome, {currentUser?.firstName}!</p>
          <button onClick={() => signOut.mutate()}>Sign Out</button>
        </>
      ) : (
        <button onClick={handleSignIn}>Sign In</button>
      )}
    </div>
  );
}
```

### Data Fetching

```typescript
// Using the consolidated hooks with new { list, byId } pattern
const { list: listCommunities, byId: getCommunity } = useCommunities();
const { list: listResources, byId: getResource } = useResources();
const { list: listEvents, byId: getEvent } = useEvents();
const { list: listShoutouts, byId: getShoutout } = useShoutouts();
const { list: listUsers, byId: getUser } = useUsers();

// Fetching lists - returns lightweight Info objects
const communityList = await listCommunities();
const resourceList = await listResources({ communityId: "abc123" });
const eventList = await listEvents({ communityId: "abc123" });
const shoutoutsList = await listShoutouts({ sentBy: "user-123" });
const userList = await listUsers({ communityId: "abc123" });

// Fetching with options
const communitiesWithDeleted = await listCommunities({ includeDeleted: true });

// Fetching single items - returns full objects with relations
const community = await getCommunity("abc123");
const resource = await getResource("def456");
const event = await getEvent("ghi789");
const shoutout = await getShoutout("xyz999");
const user = await getUser("user-123");

// Using mutations
const { create, update, delete: remove } = useResources();

await create({
  title: "Garden Tools",
  type: "offer",
  category: ResourceCategory.TOOLS,
  communityId: "abc123",
});

await update("def456", {
  title: "Updated Garden Tools",
});

await remove("def456");
```

### New { list, byId } Pattern

All entity hooks now follow a consistent pattern for optimal performance:

```typescript
const { list, byId } = useEntities(); // useShoutouts, useUsers, etc.

// List operations - returns lightweight Info objects with IDs for relations
const items = await list(); // Returns EntityInfo[]
const filtered = await list({ communityId: "abc" }); // Filtered results

// Individual operations - returns full objects with nested relations  
const fullItem = await byId("item-id"); // Returns full Entity object
```

**Key Benefits:**
- **Consistent API** - Same pattern across all entities
- **Performance Optimized** - Lists return lightweight data, details return full objects
- **Predictable** - Always know what data structure you'll receive
- **Cache Efficient** - Separate caching for list vs detail operations

**Performance Pattern:**
| Method | Returns | Use Case |
|--------|---------|----------|
| `list()` | `EntityInfo[]` (IDs for relations) | Displaying lists, tables, dropdowns |
| `byId()` | `Entity` (full nested objects) | Detail views, editing, full data needs |

## Best Practices

### 1. Error Handling

```typescript
function ResourceForm() {
  const resources = useResources();

  const handleSubmit = async (data: ResourceData) => {
    try {
      await resources.create(data);
      toast.success("Resource created!");
    } catch (error) {
      toast.error(error.message);
    }
  };
}
```

### 2. Loading States

```typescript
function CommunityPage({ id }: { id: string }) {
  const { byId } = useCommunities();
  const [community, setCommunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    byId(id)
      .then(setCommunity)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [byId, id]);

  if (loading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;
  if (!community) return <NotFound />;

  return <CommunityDetails community={community} />;
}

// For list data with manual fetching
function CommunityList() {
  const { list } = useCommunities();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    list()
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [list]);

  if (loading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;

  return <CommunityListView data={data} />;
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

### `useAuth()`

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

### `useCommunities()`

Returns an object with:

- **Data Fetching**:
  - `list(options?)` - Fetch communities list (returns `CommunityInfo[]`)
    - `options.includeDeleted?: boolean` - Include deleted communities
  - `byId(id)` - Fetch single community (returns full `Community` object)
  - `memberships(communityId)` - Fetch community memberships
  - `userMemberships(userId)` - Fetch user's community memberships
- **State** (unified across all operations):
  - `isPending` - Loading state for any operation
  - `isError` - Error state for any operation
  - `error` - Error details
- **Mutations**:
  - `create(data)` - Create new community
  - `update(id, data)` - Update community
  - `delete(id)` - Delete community
  - `join(communityId, role?)` - Join community
  - `leave(communityId)` - Leave community

**Performance**: `list()` returns lightweight `CommunityInfo` objects, `byId()` returns full `Community` objects with relations.

### `useResources()`

Returns an object with:

- **Data Fetching**:
  - `list(filters?)` - Fetch resources list (returns `ResourceInfo[]`)
    - `filters.communityId?: string` - Filter by community
    - `filters.category?: ResourceCategory` - Filter by category
    - `filters.type?: "offer" | "request"` - Filter by type
  - `byId(id)` - Fetch single resource (returns full `Resource` object)
- **State** (unified across all operations):
  - `isPending` - Loading state for any operation
  - `isError` - Error state for any operation
  - `error` - Error details
- **Mutations**:
  - `create(data)` - Create new resource
  - `update(id, data)` - Update resource
  - `delete(id)` - Delete resource

**Performance**: `list()` returns lightweight `ResourceInfo` objects, `byId()` returns full `Resource` objects with owner and community relations.

### `useEvents()`

Returns an object with:

- **Data Fetching**:
  - `list(filters?)` - Fetch events list (returns `EventInfo[]`)
    - `filters.communityId?: string` - Filter by community
    - `filters.organizerId?: string` - Filter by organizer
    - `filters.startDate?: Date` - Filter by start date
  - `byId(id)` - Fetch single event (returns full `Event` object)
  - `attendees(eventId)` - Fetch event attendees
  - `userAttendances(userId)` - Fetch user's event attendances
- **State** (unified across all operations):
  - `isPending` - Loading state for any operation
  - `isError` - Error state for any operation
  - `error` - Error details
- **Mutations**:
  - `create(data)` - Create new event
  - `update(id, data)` - Update event
  - `delete(id)` - Delete event
  - `join(eventId, status?)` - Join event with attendance status
  - `leave(eventId)` - Leave event

**Performance**: `list()` returns lightweight `EventInfo` objects, `byId()` returns full `Event` objects with organizer and community relations.

### `useShoutouts()`

Returns an object with:

- **Data Fetching**:
  - `list(filters?)` - Fetch shoutouts list (returns `ShoutoutInfo[]`)
    - `filters.sentBy?: string` - Filter by sender user ID
    - `filters.receivedBy?: string` - Filter by receiver user ID
    - `filters.communityId?: string` - Filter by community
    - `filters.resourceId?: string` - Filter by resource
  - `byId(id)` - Fetch single shoutout (returns full `Shoutout` object)
- **State** (unified across all operations):
  - `isPending` - Loading state for any operation
  - `isError` - Error state for any operation
  - `error` - Error details
- **Mutations**:
  - `create(data)` - Create new shoutout
  - `update(id, data)` - Update shoutout
  - `delete(id)` - Delete shoutout

**Performance**: `list()` returns lightweight `ShoutoutInfo` objects, `byId()` returns full `Shoutout` objects with user, resource, and community relations.

### `useUsers()`

Returns an object with:

- **Data Fetching**:
  - `list(filters?)` - Fetch users list (returns `UserInfo[]`)
    - `filters.communityId?: string` - Filter by community membership
    - `filters.role?: UserRole` - Filter by role
  - `byId(id)` - Fetch single user (returns full `User` object)
- **State** (unified across all operations):
  - `isPending` - Loading state for any operation
  - `isError` - Error state for any operation
  - `error` - Error details
- **Mutations**:
  - `update(user)` - Update user profile
  - `delete(id)` - Delete user

**Performance**: `list()` returns `UserInfo` objects, `byId()` returns full `User` objects. For users, these are currently identical since User has no nested relations, but the pattern ensures consistency.

---

For internal architecture details and contributing guidelines, see [ARCHITECTURE.md](./ARCHITECTURE.md).