import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useSupabase, logger } from '@/shared';
import { fetchConversations } from '../api';
import { conversationKeys } from '../queries';
import { useCurrentUser } from '@/features/auth';
import { STANDARD_CACHE_TIME } from '@/config';
import { Conversation } from '../types';

/**
 * Hook for fetching user's direct conversations.
 *
 * Real-time updates are handled by MessageRealtimeProvider.
 *
 * @param options - Optional React Query options
 * @returns Query state for conversations
 *
 * @example
 * ```tsx
 * function ConversationList() {
 *   const { data: conversations, isLoading, error } = useConversations();
 *
 *   if (isLoading) return <div>Loading conversations...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       {conversations?.map(conversation => (
 *         <ConversationItem key={conversation.id} conversation={conversation} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useConversations(
  options?: Partial<UseQueryOptions<Conversation[], Error>>,
) {
  const supabase = useSupabase();
  const { data: currentUser } = useCurrentUser();

  const query = useQuery<Conversation[], Error>({
    queryKey: conversationKeys.list(),
    queryFn: () => {
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      return fetchConversations(supabase, currentUser.id);
    },
    enabled: !!supabase && !!currentUser,
    staleTime: STANDARD_CACHE_TIME,
    ...options,
  });

  if (query.error) {
    logger.error('useConversations: Query error', {
      error: query.error,
    });
  }

  return query;
}
