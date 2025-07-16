import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFeed } from '../../hooks/useFeed';
import { createMockSupabase } from '../../../../test-utils';
import { createFakeResource } from '../../../resources/__fakes__';
import { createFakeGathering } from '../../../gatherings/__fakes__';
import { createFakeShoutout } from '../../../shoutouts/__fakes__';
import { createDefaultTestWrapper } from '../../../../test-utils/testWrapper';

// Mock the API functions
vi.mock('../../api', () => ({
  fetchFeed: vi.fn(),
}));

import { useSupabase } from '../../../../shared';
import { fetchFeed } from '../../api';

const mockUseSupabase = vi.mocked(useSupabase);
const mockFetchFeed = vi.mocked(fetchFeed);

describe('useFeed', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = createMockSupabase({});
    mockUseSupabase.mockReturnValue(mockSupabase);
    ({ wrapper } = createDefaultTestWrapper());
  });

  it('should return Feed from combined resources and gatherings', async () => {
    // Arrange
    const fakeResource = createFakeResource({
      communityId: 'community-1',
    });
    const fakeGathering = createFakeGathering({ communityId: 'community-1' });
    
    const mockFeed = {
      items: [
        { id: fakeResource.id, type: 'resource' as const, data: fakeResource },
        { id: fakeGathering.id, type: 'gathering' as const, data: fakeGathering }
      ],
      hasMore: false
    };

    mockFetchFeed.mockResolvedValue(mockFeed);

    // Act
    const { result } = renderHook(() => useFeed(), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.data).toBeDefined();
      expect(result.current.data?.items).toHaveLength(2);
    });

    // Check that all items are present (order may vary due to timestamps)
    const types = result.current.data?.items.map(item => item.type);
    expect(types).toContain('resource');
    expect(types).toContain('gathering');
    
    // Find each item and verify it matches
    const resourceItem = result.current.data?.items.find(item => item.type === 'resource');
    const gatheringItem = result.current.data?.items.find(item => item.type === 'gathering');
    
    expect(resourceItem?.data).toEqual(fakeResource);
    expect(gatheringItem?.data).toEqual(fakeGathering);
  });

  it('should handle loading state', async () => {
    // Arrange
    mockFetchFeed.mockImplementation(() => new Promise(() => {})); // Never resolves

    // Act
    const { result } = renderHook(() => useFeed(), { wrapper });

    // Assert
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('should handle error state', async () => {
    // Arrange
    const error = new Error('API Error');
    mockFetchFeed.mockRejectedValue(error);

    // Act
    const { result } = renderHook(() => useFeed(), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });

  it('should handle empty feed', async () => {
    // Arrange
    const emptyFeed = { items: [], hasMore: false };
    mockFetchFeed.mockResolvedValue(emptyFeed);

    // Act
    const { result } = renderHook(() => useFeed(), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.data).toEqual({ items: [], hasMore: false });
    });
    expect(result.current.data?.items).toHaveLength(0);
  });

  it('should include shoutouts in the feed', async () => {
    // Arrange
    const fakeShoutout = createFakeShoutout({
      fromUserId: 'user-2',
      toUserId: 'user-1',
      resourceId: 'resource-1',
    });

    const mockFeed = {
      items: [{ id: fakeShoutout.id, type: 'shoutout' as const, data: fakeShoutout }],
      hasMore: false
    };

    mockFetchFeed.mockResolvedValue(mockFeed);

    // Act
    const { result } = renderHook(() => useFeed(), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.data).toBeDefined();
      expect(result.current.data?.items).toHaveLength(1);
    });

    expect(result.current.data?.items[0]).toEqual({
      type: 'shoutout',
      data: fakeShoutout,
    });
  });

  it('should call fetchFeed with supabase client', async () => {
    // Arrange
    const mockFeed = { items: [], hasMore: false };
    mockFetchFeed.mockResolvedValue(mockFeed);

    // Act
    const { result } = renderHook(() => useFeed(), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(mockFetchFeed).toHaveBeenCalledWith(mockSupabase);
  });
});
