import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useSupabase, logger } from '@/shared';
import { fetchCommunityUnreadCount, fetchTotalCommunityUnreadCount } from '../api/fetchCommunityUnreadCount';
import { communityChatKeys } from '../queries';
import { useCurrentUser } from '@/features/auth';
import { STANDARD_CACHE_TIME } from '@/config';

/**
 * Hook for fetching unread count for a specific community chat.
 *
 * @param communityId - The community ID to get unread count for
 * @param options - Optional React Query options
 * @returns Query state for community unread count
 */
export function useCommunityUnreadCount(
  communityId: string,
  options?: Partial<UseQueryOptions<number, Error>>,
) {
  const supabase = useSupabase();
  const { data: currentUser } = useCurrentUser();

  const query = useQuery<number, Error>({
    queryKey: communityChatKeys.unreadCount(communityId),
    queryFn: () => {
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      return fetchCommunityUnreadCount(supabase, communityId);
    },
    enabled: !!supabase && !!currentUser && !!communityId,
    staleTime: STANDARD_CACHE_TIME,
    ...options,
  });

  if (query.error) {
    logger.error('useCommunityUnreadCount: Query error', {
      error: query.error,
      communityId,
    });
  }

  return query;
}

/**
 * Hook for fetching total unread count across all community chats.
 *
 * @param options - Optional React Query options
 * @returns Query state for total community unread count
 */
export function useTotalCommunityUnreadCount(
  options?: Partial<UseQueryOptions<number, Error>>,
) {
  const supabase = useSupabase();
  const { data: currentUser } = useCurrentUser();

  const query = useQuery<number, Error>({
    queryKey: communityChatKeys.totalUnreadCount(),
    queryFn: () => {
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      return fetchTotalCommunityUnreadCount(supabase);
    },
    enabled: !!supabase && !!currentUser,
    staleTime: STANDARD_CACHE_TIME,
    ...options,
  });

  if (query.error) {
    logger.error('useTotalCommunityUnreadCount: Query error', {
      error: query.error,
    });
  }

  return query;
}