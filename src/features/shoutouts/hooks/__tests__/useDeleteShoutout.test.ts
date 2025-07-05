import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useDeleteShoutout } from '../useDeleteShoutout';

// Mock the shared module
vi.mock('../../../../shared', () => ({
  useSupabase: vi.fn(),
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  queryKeys: {
    shoutouts: {
      all: ['shoutouts'],
      byId: (id: string) => ['shoutouts', id],
    },
  },
}));

// Mock the shoutout service
vi.mock('../../services/shoutouts.service', () => ({
  createShoutoutsService: vi.fn(),
}));

import { useSupabase } from '../../../../shared';
import { createShoutoutsService } from '../../services/shoutouts.service';

const mockUseSupabase = vi.mocked(useSupabase);
const mockCreateShoutoutsService = vi.mocked(createShoutoutsService);
const mockDeleteShoutout = vi.fn();

describe('useDeleteShoutout', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();

    // Setup mocks
    mockUseSupabase.mockReturnValue({} as any);
    mockCreateShoutoutsService.mockReturnValue({
      deleteShoutout: mockDeleteShoutout,
    });
  });

  const wrapper = ({ children }: { children: any }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  it('should successfully delete a shoutout', async () => {
    // Arrange
    const shoutoutId = 'shoutout-123';
    mockDeleteShoutout.mockResolvedValue(undefined);

    // Act
    const { result } = renderHook(() => useDeleteShoutout(), { wrapper });

    const mutationResult = await result.current.mutateAsync(shoutoutId);

    // Assert
    expect(mutationResult).toBeUndefined();
    expect(mockDeleteShoutout).toHaveBeenCalledWith(shoutoutId);

    // Wait for mutation state to update
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isError).toBe(false);
    });
  });

  it('should handle deletion errors properly', async () => {
    // Arrange
    const shoutoutId = 'non-existent-shoutout';
    const error = new Error('Shoutout not found');
    mockDeleteShoutout.mockRejectedValue(error);

    // Act
    const { result } = renderHook(() => useDeleteShoutout(), { wrapper });

    // Wait for mutation to be ready
    await waitFor(() => expect(result.current.mutate).toBeDefined());

    try {
      await result.current.mutateAsync(shoutoutId);
    } catch (e) {
      // Expected to throw
    }

    // Wait for error state
    await waitFor(() => expect(result.current.isError).toBe(true));

    // Assert
    expect(result.current.error).toEqual(error);
    expect(result.current.isSuccess).toBe(false);
  });

  it('should handle authorization errors', async () => {
    // Arrange
    const shoutoutId = 'unauthorized-shoutout';
    const error = new Error('You are not authorized to delete this shoutout');
    mockDeleteShoutout.mockRejectedValue(error);

    // Act
    const { result } = renderHook(() => useDeleteShoutout(), { wrapper });

    try {
      await result.current.mutateAsync(shoutoutId);
    } catch (e) {
      // Expected to throw
    }

    // Wait for error state
    await waitFor(() => expect(result.current.isError).toBe(true));

    // Assert
    expect(result.current.error).toEqual(error);
  });

  it('should handle non-existent shoutout gracefully', async () => {
    // Arrange - Service returns success even if shoutout doesn't exist (idempotent delete)
    const shoutoutId = 'already-deleted-shoutout';
    mockDeleteShoutout.mockResolvedValue(undefined);

    // Act
    const { result } = renderHook(() => useDeleteShoutout(), { wrapper });

    const mutationResult = await result.current.mutateAsync(shoutoutId);

    // Assert
    expect(mutationResult).toBeUndefined();

    // Wait for mutation state to update
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isError).toBe(false);
    });
  });

  it('should invalidate and remove shoutout queries on successful deletion', async () => {
    // Arrange
    const shoutoutId = 'shoutout-789';
    mockDeleteShoutout.mockResolvedValue(undefined);

    // Spy on queryClient methods
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const removeQueriesSpy = vi.spyOn(queryClient, 'removeQueries');

    // Act
    const { result } = renderHook(() => useDeleteShoutout(), { wrapper });
    await result.current.mutateAsync(shoutoutId);

    // Assert cache invalidation and removal happened
    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['shoutouts'],
      });
      expect(removeQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['shoutouts', shoutoutId],
      });
    });
  });

  it('should provide a stable mutate function reference', () => {
    // Act
    const { result, rerender } = renderHook(() => useDeleteShoutout(), {
      wrapper,
    });
    const firstMutate = result.current.mutate;

    // Trigger re-render
    rerender();
    const secondMutate = result.current.mutate;

    // Assert - Function reference should be stable
    expect(firstMutate).toBe(secondMutate);
  });

  it('should be initially in idle state', () => {
    // Act
    const { result } = renderHook(() => useDeleteShoutout(), { wrapper });

    // Assert
    expect(result.current.isPending).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();
  });

  it('should reset mutation state between calls', async () => {
    // Arrange
    const firstShoutoutId = 'shoutout-1';
    const secondShoutoutId = 'shoutout-2';
    mockDeleteShoutout.mockResolvedValue(undefined);

    // Act
    const { result } = renderHook(() => useDeleteShoutout(), { wrapper });

    // First deletion
    await result.current.mutateAsync(firstShoutoutId);
    await waitFor(() => {
      expect(result.current.isSuccess || result.current.isError).toBeTruthy();
    });
    if (result.current.isError) {
      throw result.current.error;
    }
    // Reset mutation
    result.current.reset();
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
    });

    // Second deletion
    await result.current.mutateAsync(secondShoutoutId);
    await waitFor(() => {
      expect(result.current.isSuccess || result.current.isError).toBeTruthy();
    });
    if (result.current.isError) {
      throw result.current.error;
    }
  });
});
