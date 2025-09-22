import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useSupabase, logger } from '@/shared';
import { fetchMessages } from '../api';
import { Message } from '../types';
import { conversationKeys } from '../queries';
import { STANDARD_CACHE_TIME } from '@/config';

/**
 * Hook for fetching messages for a conversation.
 *
 * Real-time updates are handled by MessageRealtimeProvider.
 *
 * @param conversationId - The conversation ID to fetch messages for
 * @param options - Optional React Query options
 * @returns Query state for messages
 *
 * @example
 * ```tsx
 * function MessageList({ conversationId }) {
 *   const { data: messages, isLoading, error } = useMessages(conversationId);
 *
 *   if (isLoading) return <div>Loading messages...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       {messages?.map(message => (
 *         <MessageBubble key={message.id} message={message} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useMessages(
  conversationId: string,
  options?: Partial<UseQueryOptions<Message[], Error>>,
) {
  const supabase = useSupabase();

  const query = useQuery<Message[], Error>({
    queryKey: conversationKeys.messages(conversationId),
    queryFn: () => fetchMessages(supabase, { conversationId }),
    staleTime: STANDARD_CACHE_TIME,
    enabled: !!conversationId,
    ...options,
  });

  if (query.error) {
    logger.error('useMessages: Query error', {
      error: query.error,
      conversationId,
    });
  }

  return query;
}
