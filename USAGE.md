# Belong Network Platform Usage Guide

This guide covers advanced usage patterns and best practices for the Belong Network Platform. For basic setup and getting started, see the [README](./README.md).

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

### Testing Components

Test components that use platform hooks:

```tsx
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

// Mock the platform hooks
vi.mock('@belongnetwork/platform', () => ({
  useResources: () => ({
    data: [{ id: '1', title: 'Test Resource' }],
    isLoading: false,
    error: null,
  }),
  useCreateResource: () => ({
    mutateAsync: vi.fn(),
  }),
}));

test('displays resources', () => {
  render(<ResourceList />);
  expect(screen.getByText('Test Resource')).toBeInTheDocument();
});
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

## TypeScript Usage

The platform is fully typed. Use the exported types for type safety:

```tsx
import type {
  Community,
  Resource,
  ResourceData,
  ResourceFilter,
} from '@belongnetwork/platform';

interface ResourceFormProps {
  onSubmit: (data: ResourceData) => Promise<void>;
  community: Community;
}

function ResourceForm({ onSubmit, community }: ResourceFormProps) {
  // Fully typed component
}
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
