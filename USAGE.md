# Belong Network Platform Usage Guide

This guide covers usage patterns and best practices for the Belong Network Platform. For basic setup and getting started, see the [README](./README.md).

## Platform Features

### Authentication

- **`useCurrentUser()`** - Get current authenticated user
- **`useSignIn()`** - Sign in with email and password
- **`useSignUp()`** - Register new user account
- **`useSignOut()`** - Sign out current user

### Communities

- **`useCommunities()`** - List communities
- **`useCommunity()`** - Get single community details
- **`useCreateCommunity()`** - Create new community
- **`useUpdateCommunity()`** - Update community details
- **`useDeleteCommunity()`** - Delete community
- **`useJoinCommunity()`** - Join a community
- **`useLeaveCommunity()`** - Leave a community
- **`useCommunityMembers()`** - Get community members
- **`useUserCommunities()`** - Get user's communities

### Resources

- **`useResources()`** - List resources with filters
- **`useResource()`** - Get single resource details
- **`useCreateResource()`** - Create new resource offer/request
- **`useUpdateResource()`** - Update resource details
- **`useDeleteResource()`** - Delete resource

### Events

- **`useEvents()`** - List events with filters
- **`useEvent()`** - Get single event details
- **`useCreateEvent()`** - Create new event
- **`useUpdateEvent()`** - Update event details
- **`useDeleteEvent()`** - Delete event

### Users

- **`useUsers()`** - List users with filters
- **`useUser()`** - Get single user details
- **`useCreateUser()`** - Create new user profile
- **`useUpdateUser()`** - Update user profile
- **`useDeleteUser()`** - Delete user account

### Images

- **`useImageUpload()`** - Upload images to temporary storage
- **`commitImageUrls()`** - Convert temporary images to permanent storage

### Types

- **Authentication**: `Account`, `User`
- **Communities**: `Community`, `CommunityData`, `CommunityFilter`
- **Resources**: `Resource`, `ResourceData`, `ResourceFilter`, `ResourceInfo`
- **Events**: `Event`, `EventData`, `EventFilter`, `EventInfo`
- **Users**: `User`, `UserData`, `UserFilter`
- **Images**: `ImageUploadResult`, `EntityType`
- **Geography**: `Coordinates`, `AddressSearchResult`

## Advanced Patterns

### Error Handling

Handle errors gracefully in your components:

```tsx
function ResourceList() {
  const { data: resources, error, isLoading } = useResources();
  const createResource = useCreateResource();

  const handleCreate = async (data: ResourceData) => {
    try {
      await createResource.mutateAsync(data);
      toast.success("Resource created!");
    } catch (error) {
      toast.error(error.message || "Failed to create resource");
    }
  };

  if (error) {
    return <ErrorBoundary error={error} retry={() => window.location.reload()} />;
  }

  return (
    // Component UI
  );
}
```

### Optimistic Updates

The platform handles optimistic updates automatically for better UX. Your UI updates immediately while mutations process in the background.

### Loading States

Implement proper loading states for better user experience:

```tsx
function CommunityDetails({ id }: { id: string }) {
  const { data: community, isLoading, error } = useCommunity(id);

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;
  if (!community) return <NotFound />;

  return <CommunityView community={community} />;
}
```

### Filtering and Pagination

Use filters to query specific data:

```tsx
const { data: resources } = useResources({
  type: 'offer',
  category: 'tools',
  communityId: 'community-123',
  // Pagination support coming in future versions
});
```

### Real-time Updates

Subscribe to real-time changes (requires additional Supabase configuration):

```tsx
// Real-time subscriptions will be available in future versions
// Currently, use refetch intervals for near real-time updates:
const { data } = useResources(filters, {
  refetchInterval: 30000, // Refetch every 30 seconds
});
```

### Custom Hooks

Build custom hooks on top of platform hooks:

```tsx
// Custom hook for user's resources
function useMyResources() {
  const { data: currentUser } = useCurrentUser();
  return useResources({
    ownerId: currentUser?.id,
  });
}

// Custom hook for community admin features
function useCommunityAdmin(communityId: string) {
  const { data: community } = useCommunity(communityId);
  const { data: currentUser } = useCurrentUser();
  const updateCommunity = useUpdateCommunity();

  const isAdmin = community?.organizerId === currentUser?.id;

  return {
    community,
    isAdmin,
    updateCommunity: isAdmin ? updateCommunity : undefined,
  };
}
```

### Performance Optimization

#### Query Keys and Caching

The platform uses hierarchical query keys for efficient cache management:

```tsx
// Resources are cached separately by filter
useResources(); // Cache key: ['resources']
useResources({ type: 'offer' }); // Cache key: ['resources', { type: 'offer' }]
useResource('123'); // Cache key: ['resource', '123']
```

#### Selective Subscriptions

Components only subscribe to the data they need:

```tsx
// This component only re-renders when communities change
function CommunityList() {
  const { data: communities } = useCommunities();
  // Not subscribed to resources, events, etc.
}
```

### Environment Configuration

Configure React Query for your needs:

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
      gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
      retry: 1, // Retry failed requests once
      refetchOnWindowFocus: false, // Disable refetch on focus
    },
    mutations: {
      retry: 1,
    },
  },
});
```

## Best Practices

1. **Always handle loading and error states** - Don't assume data is always available
2. **Use proper TypeScript types** - Import types from the platform for consistency
3. **Implement optimistic UI** - The platform handles optimistic updates automatically
4. **Cache data appropriately** - Use React Query's caching strategies
5. **Test with mocked hooks** - Mock at the hook level when testing UI components

## Architecture Notes

For internal architecture details and contributing guidelines, see:

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Internal design and patterns
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Development guidelines
