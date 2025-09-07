import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useSupabase, logger } from '@/shared';
import { fetchMessages } from '../api';
import { Message } from '../types';
import { transformMessage } from '../transformers';
import { useConversation } from './useConversation';
import { useCurrentUser } from '@/features/auth';
import { messageKeys } from '../queries';
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
  options?: Partial<UseQueryOptions<Message[], Error>>
) {
  const supabase = useSupabase();
  const { data: conversation } = useConversation(conversationId);
  const { data: currentUser } = useCurrentUser();

  const query = useQuery<Message[], Error>({
    queryKey: messageKeys.list(conversationId),
    queryFn: async () => {
      if (!supabase || !currentUser || !conversation) {
        throw new Error('Dependencies not available');
      }

      logger.debug('useMessages: loading messages', {
        conversationId,
        userId: currentUser.id,
      });

      // Load messages
      const initialData = await fetchMessages(supabase, conversationId, {
        limit: 1000, // Large limit to get all messages
      });

      logger.info('useMessages: messages loaded', {
        conversationId,
        messageCount: initialData.messages.length,
        hasMore: initialData.hasMore,
      });

      // Transform messages with participant data
      const transformedMessages = initialData.messages.map((msg) => {
        const message = transformMessage(
          msg,
          currentUser.id,
          currentUser,
          conversation.otherParticipant,
        );
        message.conversationId = conversationId;
        return message;
      });

      return transformedMessages;
    },
    enabled: !!supabase && !!currentUser && !!conversation && !!conversationId,
    staleTime: STANDARD_CACHE_TIME,
    ...options,
  });

  if (query.error) {
    logger.error('useMessages: Query error', {
      error: query.error,
      conversationId,
      userId: currentUser?.id,
    });
  }

  return query;
}
