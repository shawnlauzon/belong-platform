import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useDeleteResource } from '../hooks/useDeleteResource';
import { deleteResource } from '../impl/deleteResource';

// Mock the implementation function
vi.mock('../impl/deleteResource');

// Create a test-utils file
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useDeleteResource', () => {
  const resourceId = 'resource-1';

  beforeEach(() => {
    vi.clearAllMocks();
    (deleteResource as any).mockResolvedValue(undefined);
  });

  it('should delete a resource and update the cache', async () => {
    // Arrange
    const wrapper = createWrapper();
    const { result } = renderHook(() => useDeleteResource(), {
      wrapper,
    });

    // Act - Call the mutation
    result.current.mutate(resourceId);

    // Assert - Check loading state
    expect(result.current.isPending).toBe(true);

    // Wait for the mutation to complete
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    
    // Verify deleteResource was called with the correct ID
    expect(deleteResource).toHaveBeenCalledWith(resourceId);
  });

  it('should call onSuccess callback when provided', async () => {
    // Arrange
    const onSuccess = vi.fn();
    const wrapper = createWrapper();
    const { result } = renderHook(() => useDeleteResource({ onSuccess }), {
      wrapper,
    });

    // Act
    result.current.mutate(resourceId);

    // Wait for the mutation to complete
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verify the onSuccess callback was called with the resource ID
    expect(onSuccess).toHaveBeenCalledWith(
      undefined, // No data is returned from deleteResource
      resourceId,
      expect.anything()
    );
  });

  it('should handle errors', async () => {
    // Arrange
    const error = new Error('Failed to delete resource');
    (deleteResource as any).mockRejectedValueOnce(error);
    const onError = vi.fn();
    const wrapper = createWrapper();
    
    const { result } = renderHook(() => useDeleteResource({ onError }), {
      wrapper,
    });

    // Act
    result.current.mutate(resourceId);

    // Wait for the error
    await waitFor(() => expect(result.current.isError).toBe(true));
    
    // Verify the error callback was called
    expect(onError).toHaveBeenCalledWith(error, resourceId, expect.anything());
    expect(result.current.error).toEqual(error);
  });

  it('should invalidate resources and resource queries on success', async () => {
    // Arrange
    const queryClient = new QueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
    
    const { result } = renderHook(() => useDeleteResource(), { wrapper: Wrapper });

    // Act
    result.current.mutate(resourceId);
    
    // Wait for the mutation to complete
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    
    // Verify the query cache was invalidated for both resources list and the specific resource
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['resources'],
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['resources', resourceId],
    });
  });
  });
});
