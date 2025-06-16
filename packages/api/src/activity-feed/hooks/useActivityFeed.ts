import { useQuery } from '@tanstack/react-query';
import type { ActivityItem, ActivityFeedFilter } from '@belongnetwork/types';
import { fetchActivityFeed } from '../impl';

export function useActivityFeed(filter: ActivityFeedFilter) {
  return useQuery({
    queryKey: ['activity-feed', filter],
    queryFn: () => fetchActivityFeed(filter),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!filter.communityId,
  });
}

export function useCommunityActivityFeed(
  communityId: string,
  options: Omit<ActivityFeedFilter, 'communityId'> = {}
) {
  return useActivityFeed({
    ...options,
    communityId,
  });
}

export function useUserActivityFeed(
  userId: string,
  options: Omit<ActivityFeedFilter, 'userId'> = {}
) {
  return useActivityFeed({
    ...options,
    userId,
  });
}