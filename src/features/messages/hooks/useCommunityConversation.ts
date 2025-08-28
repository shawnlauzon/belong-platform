import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { logger } from '@/shared';
import { useSupabase } from '@/shared';
import { fetchCommunityConversation } from '@/features/messages/api';
import { STANDARD_CACHE_TIME } from '@/config';

import type { CommunityConversation } from '@/features/messages/types';

/**
 * Hook for fetching a community's conversation.
 *
 * Returns the community chat conversation for a specific community.
 * If no conversation exists, returns null.
 *
 * @param communityId - The community ID to fetch conversation for
 * @returns Query state for community conversation
 *
 * @example
 * ```tsx
 * function CommunityChat({ communityId }) {
 *   const { data: conversation, isPending, error } = useCommunityConversation(communityId);
 *
 *   if (isPending) return <div>Loading chat...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *   if (!conversation) return <div>No chat available for this community</div>;
 *
 *   return (
 *     <div>
 *       <h2>Community Chat</h2>
 *       <p>Participants: {conversation.participantCount}</p>
 *       <p>Unread: {conversation.unreadCount}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useCommunityConversation(
  communityId: string,
  options?: Partial<UseQueryOptions<CommunityConversation | null, Error>>,
) {
  const supabase = useSupabase();

  const query = useQuery<CommunityConversation | null, Error>({
    queryKey: ['conversations', 'community', communityId],
    queryFn: () => fetchCommunityConversation(supabase, communityId),
    staleTime: STANDARD_CACHE_TIME,
    ...options,
  });

  if (query.error) {
    logger.error('💬 API: Error fetching community conversation', {
      error: query.error,
      communityId,
    });
  }

  return query;
}