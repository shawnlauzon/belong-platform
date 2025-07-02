import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import type { ShoutoutData, Shoutout } from '../../types';
import { useUpdateShoutout } from '../useUpdateShoutout';
import { createMockUser } from '../../../users/__mocks__';
import { ResourceCategory } from '../../../resources';
import { createMockCommunity } from '../../../communities/__mocks__';

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
const mockUpdateShoutout = vi.fn();

describe('useUpdateShoutout', () => {
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
      updateShoutout: mockUpdateShoutout,
    });
  });

  const wrapper = ({ children }: { children: any }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  it('should successfully update a shoutout and return updated Shoutout object', async () => {
    // Arrange
    const shoutoutId = 'shoutout-123';
    const updateData: Partial<ShoutoutData> = {
      message: 'Updated: Thanks for the excellent mentoring!',
      impactDescription: 'Significantly improved my coding skills',
    };

    const mockUpdatedShoutout: Shoutout = {
      id: shoutoutId,
      message: 'Updated: Thanks for the excellent mentoring!',
      fromUser: createMockUser({ id: 'user-1' }),
      toUser: createMockUser({ id: 'user-2' }),
      resource: {
        id: 'resource-1',
        type: 'offer',
        title: 'Mentoring Session',
        description: 'One-on-one coding mentorship',
        category: 'education' as ResourceCategory,
        owner: createMockUser(),
        community: createMockCommunity(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      impactDescription: 'Significantly improved my coding skills',
      imageUrls: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockUpdateShoutout.mockResolvedValue(mockUpdatedShoutout);

    // Act
    const { result } = renderHook(() => useUpdateShoutout(), { wrapper });
    
    const mutationResult = await result.current.mutateAsync({ id: shoutoutId, data: updateData });

    // Assert
    expect(mutationResult).toEqual(mockUpdatedShoutout);
    expect(mockUpdateShoutout).toHaveBeenCalledWith(shoutoutId, updateData);
    
    // Wait for mutation state to update
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isError).toBe(false);
    });
  });

  it('should handle update errors properly', async () => {
    // Arrange
    const shoutoutId = 'non-existent-shoutout';
    const updateData: Partial<ShoutoutData> = {
      message: 'This should fail',
    };

    const error = new Error('Shoutout not found');
    mockUpdateShoutout.mockRejectedValue(error);

    // Act
    const { result } = renderHook(() => useUpdateShoutout(), { wrapper });

    // Wait for mutation to be ready
    await waitFor(() => expect(result.current.mutate).toBeDefined());

    try {
      await result.current.mutateAsync({ id: shoutoutId, data: updateData });
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
    const updateData: Partial<ShoutoutData> = {
      message: 'Trying to update someone elses shoutout',
    };

    const error = new Error('You are not authorized to update this shoutout');
    mockUpdateShoutout.mockRejectedValue(error);

    // Act
    const { result } = renderHook(() => useUpdateShoutout(), { wrapper });

    try {
      await result.current.mutateAsync({ id: shoutoutId, data: updateData });
    } catch (e) {
      // Expected to throw
    }

    // Wait for error state
    await waitFor(() => expect(result.current.isError).toBe(true));

    // Assert
    expect(result.current.error).toEqual(error);
  });

  it('should invalidate shoutouts queries on successful update', async () => {
    // Arrange
    const shoutoutId = 'shoutout-789';
    const updateData: Partial<ShoutoutData> = {
      message: 'Updated message',
    };

    const mockUpdatedShoutout: Shoutout = {
      id: shoutoutId,
      message: 'Updated message',
      fromUser: createMockUser({ id: 'user-1' }),
      toUser: createMockUser({ id: 'user-2' }),
      resource: {
        id: 'resource-1',
        type: 'offer',
        title: 'Community Event',
        description: 'Local community gathering',
        category: 'other' as ResourceCategory,
        owner: createMockUser(),
        community: createMockCommunity(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      imageUrls: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockUpdateShoutout.mockResolvedValue(mockUpdatedShoutout);

    // Spy on queryClient methods
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const setQueryDataSpy = vi.spyOn(queryClient, 'setQueryData');

    // Act
    const { result } = renderHook(() => useUpdateShoutout(), { wrapper });
    await result.current.mutateAsync({ id: shoutoutId, data: updateData });

    // Assert cache invalidation happened
    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['shoutouts'] });
      expect(setQueryDataSpy).toHaveBeenCalledWith(['shoutouts', shoutoutId], mockUpdatedShoutout);
    });
  });

  it('should provide a stable mutate function reference', () => {
    // Act
    const { result, rerender } = renderHook(() => useUpdateShoutout(), { wrapper });
    const firstMutate = result.current.mutate;

    // Trigger re-render
    rerender();
    const secondMutate = result.current.mutate;

    // Assert - Function reference should be stable
    expect(firstMutate).toBe(secondMutate);
  });

  it('should be initially in idle state', () => {
    // Act
    const { result } = renderHook(() => useUpdateShoutout(), { wrapper });

    // Assert
    expect(result.current.isPending).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();
  });
});