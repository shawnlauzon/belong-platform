import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useSupabase, logger } from '@/shared';
import { fetchCommunityChats } from '../api/fetchCommunityChats';
import { conversationKeys } from '../queries';
import { useCurrentUser } from '@/features/auth';
import { STANDARD_CACHE_TIME } from '@/config';
import { CommunityChat } from '../types';

/**
 * Hook for fetching user's community chats.
 *
 * Real-time updates are handled by MessageRealtimeProvider.
 *
 * @param options - Optional React Query options
 * @returns Query state for community chats
 *
 * @example
 * ```tsx
 * function CommunityChatsList() {
 *   const { data: chats, isLoading, error } = useCommunityChats();
 *
 *   if (isLoading) return <div>Loading chats...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       {chats?.map(chat => (
 *         <CommunityChatItem key={chat.communityId} chat={chat} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useCommunityChats(
  options?: Partial<UseQueryOptions<CommunityChat[], Error>>,
) {
  const supabase = useSupabase();
  const { data: currentUser } = useCurrentUser();

  const query = useQuery<CommunityChat[], Error>({
    queryKey: conversationKeys.communityChats(),
    queryFn: () => {
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      return fetchCommunityChats(supabase, currentUser.id);
    },
    enabled: !!supabase && !!currentUser,
    staleTime: STANDARD_CACHE_TIME,
    ...options,
  });

  if (query.error) {
    logger.error('useCommunityChats: Query error', {
      error: query.error,
    });
  }

  return query;
}