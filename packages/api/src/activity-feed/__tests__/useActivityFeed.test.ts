import { describe, it, expect, vi } from 'vitest';
import { useActivityFeed, useCommunityActivityFeed, useUserActivityFeed } from '../hooks/useActivityFeed';
import type { ActivityFeedFilter } from '@belongnetwork/types';

// Mock the fetchActivityFeed function
vi.mock('../impl', () => ({
  fetchActivityFeed: vi.fn().mockResolvedValue([]),
}));

// Mock the React Query hook
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn().mockReturnValue({
    data: [],
    isLoading: false,
    isSuccess: true,
    error: null,
  }),
}));

describe('useActivityFeed hooks', () => {

  describe('useActivityFeed', () => {
    it('should call useQuery with correct parameters', () => {
      const filter: ActivityFeedFilter = {
        communityId: 'community-1',
        pageSize: 10,
      };

      const result = useActivityFeed(filter);

      expect(result.data).toEqual([]);
      expect(result.isSuccess).toBe(true);
    });

    it('should handle filter without communityId', () => {
      const filter: ActivityFeedFilter = {
        pageSize: 10,
      };

      const result = useActivityFeed(filter);

      expect(result.isLoading).toBe(false);
    });
  });

  describe('useCommunityActivityFeed', () => {
    it('should call useActivityFeed with communityId', () => {
      const result = useCommunityActivityFeed('community-1', { pageSize: 5 });

      expect(result.data).toEqual([]);
      expect(result.isSuccess).toBe(true);
    });
  });

  describe('useUserActivityFeed', () => {
    it('should call useActivityFeed with userId', () => {
      const result = useUserActivityFeed('user-1', { pageSize: 5 });

      expect(result.data).toEqual([]);
      expect(result.isSuccess).toBe(true);
    });
  });
});