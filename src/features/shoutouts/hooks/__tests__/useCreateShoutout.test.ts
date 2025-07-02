import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import type { ShoutoutData, Shoutout } from '../../types';
import { useCreateShoutout } from '../useCreateShoutout';
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
const mockCreateShoutout = vi.fn();

describe('useCreateShoutout', () => {
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
      createShoutout: mockCreateShoutout,
    });
  });

  const wrapper = ({ children }: { children: any }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  it('should successfully create a shoutout and return Shoutout object', async () => {
    // Arrange
    const shoutoutData: ShoutoutData = {
      message: 'Thanks for the amazing workshop!',
      toUserId: 'user-2',
      resourceId: 'resource-1',
      impactDescription: 'Learned valuable skills',
    };

    const mockCreatedShoutout: Shoutout = {
      id: 'shoutout-123',
      message: 'Thanks for the amazing workshop!',
      fromUser: createMockUser({ id: 'user-1' }),
      toUser: createMockUser({ id: 'user-2' }),
      resource: {
        id: 'resource-1',
        type: 'offer',
        title: 'Programming Workshop',
        description: 'Learn JavaScript fundamentals',
        category: 'education' as ResourceCategory,
        owner: createMockUser(),
        community: createMockCommunity(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      impactDescription: 'Learned valuable skills',
      imageUrls: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockCreateShoutout.mockResolvedValue(mockCreatedShoutout);

    // Act
    const { result } = renderHook(() => useCreateShoutout(), { wrapper });
    
    const mutationResult = await result.current.mutateAsync(shoutoutData);

    // Assert
    expect(mutationResult).toEqual(mockCreatedShoutout);
    expect(mockCreateShoutout).toHaveBeenCalledWith(shoutoutData);
    
    // Wait for mutation state to update
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isError).toBe(false);
    });
  });

  it('should handle creation errors properly', async () => {
    // Arrange
    const shoutoutData: ShoutoutData = {
      message: 'Invalid shoutout',
      toUserId: 'invalid-user',
      resourceId: 'resource-1',
    };

    const error = new Error('User not found');
    mockCreateShoutout.mockRejectedValue(error);

    // Act
    const { result } = renderHook(() => useCreateShoutout(), { wrapper });

    // Wait for mutation to be ready
    await waitFor(() => expect(result.current.mutate).toBeDefined());

    try {
      await result.current.mutateAsync(shoutoutData);
    } catch (e) {
      // Expected to throw
    }

    // Wait for error state
    await waitFor(() => expect(result.current.isError).toBe(true));

    // Assert
    expect(result.current.error).toEqual(error);
    expect(result.current.isSuccess).toBe(false);
  });

  it('should invalidate shoutouts queries on successful creation', async () => {
    // Arrange
    const shoutoutData: ShoutoutData = {
      message: 'Great collaboration!',
      toUserId: 'user-2',
      resourceId: 'resource-1',
    };

    const mockCreatedShoutout: Shoutout = {
      id: 'shoutout-456',
      message: 'Great collaboration!',
      fromUser: createMockUser({ id: 'user-1' }),
      toUser: createMockUser({ id: 'user-2' }),
      resource: {
        id: 'resource-1',
        type: 'offer',
        title: 'Team Project',
        description: 'Collaborative coding project',
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

    mockCreateShoutout.mockResolvedValue(mockCreatedShoutout);

    // Spy on queryClient methods
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const setQueryDataSpy = vi.spyOn(queryClient, 'setQueryData');

    // Act
    const { result } = renderHook(() => useCreateShoutout(), { wrapper });
    await result.current.mutateAsync(shoutoutData);

    // Assert cache invalidation happened
    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['shoutouts'] });
      expect(setQueryDataSpy).toHaveBeenCalledWith(['shoutouts', 'shoutout-456'], mockCreatedShoutout);
    });
  });

  it('should provide a stable mutate function reference', () => {
    // Act
    const { result, rerender } = renderHook(() => useCreateShoutout(), { wrapper });
    const firstMutate = result.current.mutate;

    // Trigger re-render
    rerender();
    const secondMutate = result.current.mutate;

    // Assert - Function reference should be stable
    expect(firstMutate).toBe(secondMutate);
  });

  it('should be initially in idle state', () => {
    // Act
    const { result } = renderHook(() => useCreateShoutout(), { wrapper });

    // Assert
    expect(result.current.isPending).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();
  });
});