import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import { useSupabase } from '../../auth/providers/CurrentUserProvider';
import { createConversationsService } from '../services/conversations.service';
import { queryKeys } from '../../shared/queryKeys';

/**
 * React Query mutation hook for marking messages as read.
 * 
 * This hook marks individual messages as read and automatically updates
 * the cache to reflect changed unread counts in conversations and messages.
 * Must be used within a BelongProvider context.
 * 
 * @returns React Query mutation object for marking messages as read
 * 
 * @example
 * ```tsx
 * function MessageBubble({ message, isLastMessage }) {
 *   const markAsRead = useMarkAsRead();
 * 
 *   // Auto-mark as read when message comes into view
 *   useEffect(() => {
 *     if (isLastMessage && !message.readAt) {
 *       markAsRead.mutate(message.id);
 *     }
 *   }, [isLastMessage, message.readAt, message.id, markAsRead]);
 * 
 *   return (
 *     <div className={message.readAt ? 'read' : 'unread'}>
 *       {message.content}
 *       {message.readAt && <span>✓</span>}
 *     </div>
 *   );
 * }
 * ```
 * 
 * @example
 * ```tsx
 * function ConversationView({ conversationId }) {
 *   const { data: messages } = useMessages(conversationId);
 *   const markAsRead = useMarkAsRead();
 * 
 *   // Mark all unread messages as read when conversation opens
 *   useEffect(() => {
 *     const unreadMessages = messages?.filter(m => !m.readAt) || [];
 *     unreadMessages.forEach(message => {
 *       markAsRead.mutate(message.id);
 *     });
 *   }, [messages, markAsRead]);
 * 
 *   return <div>{/\* Conversation UI *\/}</div>;
 * }
 * ```
 * 
 * @category React Hooks
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const conversationsService = createConversationsService(supabase);

  return useMutation<void, Error, string>({
    mutationFn: (messageId) => conversationsService.markAsRead(messageId),
    onSuccess: (_, messageId) => {
      // Invalidate all conversations and messages queries
      // since read status affects unread counts
      queryClient.invalidateQueries({ 
        queryKey: ['user', 'conversations'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['conversations', 'messages'] 
      });

      logger.info('💬 useMarkAsRead: Successfully marked message as read', {
        messageId,
      });
    },
    onError: (error) => {
      logger.error('💬 useMarkAsRead: Failed to mark message as read', { error });
    },
  });
}