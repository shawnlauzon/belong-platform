import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useSupabase, logger } from '@/shared';
import { fetchMessages } from '../api';
import { communityChatKeys } from '../queries';
import { useCurrentUser } from '@/features/auth';
import { STANDARD_CACHE_TIME } from '@/config';
import type { Message } from '@/features/messaging/types';

/**
 * Hook for fetching community chat messages.
 *
 * Directly fetches messages by community_id.
 *
 * @param communityId - The community ID to fetch messages for
 * @param options - Optional React Query options
 * @returns Query state for community messages
 *
 * @example
 * ```tsx
 * function CommunityMessageList({ communityId }) {
 *   const { data: messages, isLoading, error } = useCommunityMessages(communityId);
 *
 *   if (isLoading) return <div>Loading messages...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       {messages?.map(message => (
 *         <div key={message.id}>
 *           <strong>{message.sender.displayName}</strong>: {message.content}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useCommunityMessages(
  communityId: string,
  options?: Partial<UseQueryOptions<Message[], Error>>,
) {
  const supabase = useSupabase();
  const { data: currentUser } = useCurrentUser();

  const query = useQuery<Message[], Error>({
    queryKey: communityChatKeys.messages(communityId),
    queryFn: () => {
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      return fetchMessages(supabase, { communityId });
    },
    enabled: !!supabase && !!currentUser && !!communityId,
    staleTime: STANDARD_CACHE_TIME,
    ...options,
  });

  if (query.error) {
    logger.error('useCommunityMessages: Query error', {
      error: query.error,
      communityId,
    });
  }

  return query;
}
