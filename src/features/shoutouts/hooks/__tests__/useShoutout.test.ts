import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import type { Shoutout } from '../../types';
import { useShoutout } from '../useShoutout';
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
const mockFetchShoutoutById = vi.fn();

describe('useShoutout', () => {
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
      fetchShoutoutById: mockFetchShoutoutById,
    });
  });

  const wrapper = ({ children }: { children: any }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  it('should return full Shoutout object when shoutout exists', async () => {
    // Arrange
    const mockShoutout: Shoutout = {
      id: 'shoutout-1',
      message: 'Thanks for lending the drill!',
      fromUser: {
        id: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      toUser: {
        id: 'user-2',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      resource: {
        id: 'resource-1',
        type: 'offer',
        title: 'Power Drill',
        description: 'High-quality power drill',
        category: 'tools' as ResourceCategory,
        owner: createMockUser(),
        community: createMockCommunity(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      impactDescription: 'Helped me fix my fence',
      imageUrls: ['https://example.com/image1.jpg'],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockFetchShoutoutById.mockResolvedValue(mockShoutout);

    // Act
    const { result } = renderHook(() => useShoutout('shoutout-1'), { wrapper });

    // Wait for data to be returned
    await waitFor(() => expect(result.current).toEqual(mockShoutout));

    // Assert
    expect(result.current).toEqual(mockShoutout);
    expect(mockFetchShoutoutById).toHaveBeenCalledWith('shoutout-1');

    // Verify the returned data has full objects, not just IDs
    expect(typeof result.current!.fromUser).toBe('object');
    expect(typeof result.current!.toUser).toBe('object');
    expect(typeof result.current!.resource).toBe('object');
    expect(result.current!.fromUser.firstName).toBe('John');
  });

  it('should return null when shoutout does not exist', async () => {
    // Arrange
    mockFetchShoutoutById.mockResolvedValue(null);

    // Act
    const { result } = renderHook(() => useShoutout('non-existent-id'), { wrapper });

    // Wait for data to be returned
    await waitFor(() => expect(result.current).toBeNull());

    // Assert
    expect(result.current).toBeNull();
    expect(mockFetchShoutoutById).toHaveBeenCalledWith('non-existent-id');
  });

  it('should handle errors properly', async () => {
    // Arrange
    const error = new Error('Failed to fetch shoutout');
    mockFetchShoutoutById.mockRejectedValue(error);

    // Act
    const { result } = renderHook(() => useShoutout('shoutout-1'), { wrapper });

    // Wait for error to result in null return
    await waitFor(() => expect(result.current).toBeNull());

    // Assert
    expect(result.current).toBeNull();
  });

  it('should return null initially when shoutoutId is provided', () => {
    // Act
    const { result } = renderHook(() => useShoutout('shoutout-1'), { wrapper });

    // Assert - Hook should return null initially before data loads
    expect(result.current).toBeNull();
  });

  it('should not fetch when shoutoutId is empty', () => {
    // Act
    const { result } = renderHook(() => useShoutout(''), { wrapper });

    // Assert - Hook should return null and not fetch when shoutoutId is empty
    expect(result.current).toBeNull();
    expect(mockFetchShoutoutById).not.toHaveBeenCalled();
  });
});