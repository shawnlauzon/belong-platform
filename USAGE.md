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
  const { communities, isLoading } = useCommunities();

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
// Using the consolidated hooks
const communities = useCommunities();
const resources = useResources();
const events = useEvents();

// Fetching lists
const communityList = communities.communities;
const resourceList = resources.resources({ communityId: "abc123" });
const eventList = events.events({ communityId: "abc123" });

// Fetching single items
const { data: community } = communities.getCommunity("abc123");
const { data: resource } = resources.getResource("def456");
const { data: event } = events.getEvent("ghi789");

// Using mutations
await resources.create({
  title: "Garden Tools",
  type: "offer",
  category: ResourceCategory.TOOLS,
  communityId: "abc123",
});

await resources.update("def456", {
  title: "Updated Garden Tools",
});

await resources.delete("def456");
```

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
  const communities = useCommunities();
  const { data: community, isLoading, error } = communities.getCommunity(id);

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;
  if (!community) return <NotFound />;

  return <CommunityDetails community={community} />;
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

### `useResources()`

Returns an object with:

- **Queries**:
  - `resources` - List of resources (accepts filter)
  - `getResource(id)` - Get single resource by ID
- **Mutations**:
  - `create(data)` - Create new resource
  - `update(id, data)` - Update resource
  - `delete(id)` - Delete resource

### `useEvents()`

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

### `useThanks()`

Returns an object with:

- **Queries**:
  - `thanks` - List of thanks (accepts filter)
  - `getThank(id)` - Get single thank by ID
- **Mutations**:
  - `create(data)` - Create new thanks
  - `update(id, data)` - Update thanks
  - `delete(id)` - Delete thanks

### `useUsers()`

Returns an object with:

- **Queries**:
  - `users` - List of users (accepts filter)
  - `getUser(id)` - Get single user by ID
- **Mutations**:
  - `update(id, data)` - Update user

---

For internal architecture details and contributing guidelines, see [ARCHITECTURE.md](./ARCHITECTURE.md).