import { useQuery } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import type { MessageInfo, MessageFilter } from '@belongnetwork/types';
import { useSupabase } from '../../auth/providers/CurrentUserProvider';
import { createConversationsService } from '../services/conversations.service';
import { queryKeys } from '../../shared/queryKeys';

/**
 * React Query hook for fetching messages within a specific conversation.
 * 
 * This hook automatically fetches and caches messages for a conversation,
 * with optional filtering capabilities. Messages are automatically refetched
 * when the conversation changes. Must be used within a BelongProvider context.
 * 
 * @param conversationId - The ID of the conversation to fetch messages for
 * @param filters - Optional filters to apply to the message query
 * @returns React Query result containing messages data and loading state
 * 
 * @example
 * ```tsx
 * function MessageList({ conversationId }) {
 *   const { data: messages, isLoading, error } = useMessages(conversationId);
 * 
 *   if (isLoading) return <div>Loading messages...</div>;
 *   if (error) return <div>Error loading messages: {error.message}</div>;
 * 
 *   return (
 *     <div>
 *       {messages?.map(message => (
 *         <div key={message.id}>
 *           <strong>{message.senderName}:</strong> {message.content}
 *           <small>{message.createdAt.toLocaleString()}</small>
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // With filtering for unread messages only
 * function UnreadMessages({ conversationId }) {
 *   const { data: unreadMessages } = useMessages(conversationId, {
 *     unreadOnly: true
 *   });
 * 
 *   return (
 *     <div>
 *       {unreadMessages?.length} unread messages
 *     </div>
 *   );
 * }
 * ```
 * 
 * @category React Hooks
 */
export function useMessages(conversationId: string, filters?: MessageFilter) {
  const supabase = useSupabase();
  const conversationsService = createConversationsService(supabase);

  const result = useQuery<MessageInfo[], Error>({
    queryKey: [...queryKeys.conversations.messages(conversationId), filters],
    queryFn: () => conversationsService.fetchMessages(conversationId, filters),
    enabled: !!conversationId,
  });

  // Handle errors manually since onError is deprecated
  if (result.error) {
    logger.error('💬 useMessages: Error fetching messages', { 
      error: result.error,
      conversationId,
    });
  }

  return result;
}