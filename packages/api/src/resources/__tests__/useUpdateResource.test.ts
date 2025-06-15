import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useUpdateResource } from '../hooks/useUpdateResource';
import { updateResource } from '../impl/updateResource';
import { createMockResource } from './test-utils';
import type { Resource } from '../types';

// Mock the implementation function
vi.mock('../impl/updateResource');

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

describe('useUpdateResource', () => {
  const mockUpdateData = {
    id: 'resource-1',
    title: 'Updated Resource',
    description: 'Updated description',
  };

  const mockUpdatedResource = createMockResource({
    ...mockUpdateData,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (updateResource as any).mockResolvedValue(mockUpdatedResource);
  });

  it('should update a resource and update the cache', async () => {
    // Arrange
    const wrapper = createWrapper();
    const { result } = renderHook(() => useUpdateResource(), {
      wrapper,
    });

    // Act - Call the mutation
    result.current.mutate(mockUpdateData);

    // Assert - Check loading state
    expect(result.current.isPending).toBe(true);

    // Wait for the mutation to complete
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verify updateResource was called with the correct data
    expect(updateResource).toHaveBeenCalledWith(mockUpdateData);
    
    // Verify the success callback was called with the updated resource
    await waitFor(() => {
      expect(result.current.data).toEqual(mockUpdatedResource);
    });
  });

  it('should call onSuccess callback when provided', async () => {
    // Arrange
    const onSuccess = vi.fn();
    const wrapper = createWrapper();
    const { result } = renderHook(() => useUpdateResource({ onSuccess }), {
      wrapper,
    });

    // Act
    result.current.mutate(mockUpdateData);

    // Wait for the mutation to complete
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verify the onSuccess callback was called with the updated resource
    expect(onSuccess).toHaveBeenCalledWith(
      mockUpdatedResource,
      mockUpdateData,
      expect.anything()
    );
  });

  it('should handle errors', async () => {
    // Arrange
    const error = new Error('Failed to update resource');
    (updateResource as any).mockRejectedValueOnce(error);
    const onError = vi.fn();
    const wrapper = createWrapper();
    
    const { result } = renderHook(() => useUpdateResource({ onError }), {
      wrapper,
    });

    // Act
    result.current.mutate(mockUpdateData);

    // Wait for the error
    await waitFor(() => expect(result.current.isError).toBe(true));
    
    // Verify the error callback was called
    expect(onError).toHaveBeenCalledWith(error, mockUpdateData, expect.anything());
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
    
    const { result } = renderHook(() => useUpdateResource(), { wrapper: Wrapper });

    // Act
    result.current.mutate(mockUpdateData);
    
    // Wait for the mutation to complete
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    
    // Verify the query cache was invalidated for both resources list and the specific resource
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['resources'],
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['resources', mockUpdateData.id],
    });
  });
  });
});
