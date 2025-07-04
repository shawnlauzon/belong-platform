import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import type { ShoutoutInfo } from '../../types';
import { useShoutouts } from '../useShoutouts';

// Mock the shared module
vi.mock('../../../../shared', () => ({
  useSupabase: vi.fn(),
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  toRecords: vi.fn((obj) => obj),
  queryKeys: {
    shoutouts: {
      all: ['shoutouts'],
      filtered: (filter: Record<string, any>) => ['shoutouts', 'filtered', filter],
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
const mockFetchShoutouts = vi.fn();

describe('useShoutouts (query-only)', () => {
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
      fetchShoutouts: mockFetchShoutouts,
    });
  });

  const wrapper = ({ children }: { children: any }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  it('should return ShoutoutInfo[] when filters are not provided', async () => {
    // Arrange
    const mockShoutoutInfo: ShoutoutInfo[] = [
      {
        id: 'shoutout-1',
        message: 'Great work on the project!',
        fromUserId: 'user-1',
        toUserId: 'user-2',
        resourceId: 'resource-1',
        impactDescription: 'Helped complete the community garden',
        imageUrls: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockFetchShoutouts.mockResolvedValue(mockShoutoutInfo);

    // Act
    const { result } = renderHook(() => useShoutouts(), { wrapper });

    // Wait for data to be returned
    await waitFor(() => expect(result.current).toEqual(mockShoutoutInfo));

    // Assert
    expect(result.current).toEqual(mockShoutoutInfo);
    expect(mockFetchShoutouts).toHaveBeenCalledWith(undefined);
  });

  it('should pass filters to fetchShoutouts and return filtered ShoutoutInfo[]', async () => {
    // Arrange
    const filters = { sentBy: 'user-1' };
    const mockShoutoutInfo: ShoutoutInfo[] = [
      {
        id: 'shoutout-2',
        message: 'Thanks for organizing the event!',
        fromUserId: 'user-1',
        toUserId: 'user-3',
        resourceId: 'resource-2',
        imageUrls: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    mockFetchShoutouts.mockResolvedValue(mockShoutoutInfo);

    // Act
    const { result } = renderHook(() => useShoutouts(filters), { wrapper });

    // Wait for data to be returned
    await waitFor(() => expect(result.current).toEqual(mockShoutoutInfo));

    // Assert
    expect(result.current).toEqual(mockShoutoutInfo);
    expect(mockFetchShoutouts).toHaveBeenCalledWith(filters);
  });

  it('should handle errors properly', async () => {
    // Arrange
    const error = new Error('Failed to fetch shoutouts');
    mockFetchShoutouts.mockRejectedValue(error);

    // Act
    const { result } = renderHook(() => useShoutouts(), { wrapper });

    // Wait for error to result in empty array return
    await waitFor(() => expect(result.current).toEqual([]));

    // Assert
    expect(result.current).toEqual([]);
  });

  it('should return empty array initially', () => {
    // Act
    const { result } = renderHook(() => useShoutouts(), { wrapper });

    // Assert - Hook should return empty array initially before data loads
    expect(result.current).toEqual([]);
  });

  it('should use correct query key based on filters', async () => {
    // Arrange
    const filters = { receivedBy: 'user-2' };
    mockFetchShoutouts.mockResolvedValue([]);

    // Act - This will trigger the hook but we need to verify queryKey behavior
    renderHook(() => useShoutouts(filters), { wrapper });

    // Assert - The hook should call fetchShoutouts with the right filters
    await waitFor(() => {
      expect(mockFetchShoutouts).toHaveBeenCalledWith(filters);
    });
  });
});