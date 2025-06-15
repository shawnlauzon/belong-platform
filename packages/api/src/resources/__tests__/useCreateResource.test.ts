import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { useCreateResource } from '../hooks/useCreateResource';
import { createResource } from '../impl/createResource';
import { createMockResource, createWrapper } from '../../test-utils';

// Mock the implementation function
vi.mock('../impl/createResource');

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

describe('useCreateResource', () => {
  const mockNewResource = {
    title: 'New Resource',
    description: 'Test Description',
    category: 'FOOD' as const,
    url: 'https://example.com',
  };

  const mockCreatedResource = createMockResource({
    ...mockNewResource,
    id: 'new-resource-1',
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (createResource as any).mockResolvedValue(mockCreatedResource);
  });

  it('should create a resource and update the cache', async () => {
    // Arrange
    const wrapper = createWrapper();
    const { result } = renderHook(() => useCreateResource(), {
      wrapper,
    });

    // Act - Call the mutation
    result.current.mutate(mockNewResource);

    // Assert - Check loading state
    expect(result.current.isPending).toBe(true);

    // Wait for the mutation to complete
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verify createResource was called with the correct data
    expect(createResource).toHaveBeenCalledWith(mockNewResource);
    
    // Verify the success callback was called with the created resource
    await waitFor(() => {
      expect(result.current.data).toEqual(mockCreatedResource);
    });
  });

  it('should call onSuccess callback when provided', async () => {
    // Arrange
    const onSuccess = vi.fn();
    const wrapper = createWrapper();
    const { result } = renderHook(() => useCreateResource({ onSuccess }), {
      wrapper,
    });

    // Act
    result.current.mutate(mockNewResource);

    // Wait for the mutation to complete
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verify the onSuccess callback was called with the created resource
    expect(onSuccess).toHaveBeenCalledWith(
      mockCreatedResource,
      mockNewResource,
      expect.anything()
    );
  });

  it('should handle errors', async () => {
    // Arrange
    const error = new Error('Failed to create resource');
    (createResource as any).mockRejectedValueOnce(error);
    const onError = vi.fn();
    const wrapper = createWrapper();
    
    const { result } = renderHook(() => useCreateResource({ onError }), {
      wrapper,
    });

    // Act
    result.current.mutate(mockNewResource);

    // Wait for the error
    await waitFor(() => expect(result.current.isError).toBe(true));
    
    // Verify the error callback was called
    expect(onError).toHaveBeenCalledWith(error, mockNewResource, expect.anything());
    expect(result.current.error).toEqual(error);
  });

  it('should invalidate resources query on success', async () => {
    // Arrange
    const queryClient = new QueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
    
    const { result } = renderHook(() => useCreateResource(), { wrapper: Wrapper });

    // Act
    result.current.mutate(mockNewResource);
    
    // Wait for the mutation to complete
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    
    // Verify the query cache was invalidated
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['resources'],
    });
  });
});
