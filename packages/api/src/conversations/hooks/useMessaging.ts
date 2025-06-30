import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import { useSupabase } from '../../auth/providers/CurrentUserProvider';
import { createConversationsService } from '../services/conversations.service';
import { queryKeys } from '../../shared/queryKeys';
import type { 
  ConversationInfo,
  ConversationFilter,
  MessageInfo,
  MessageFilter,
  MessageData
} from '@belongnetwork/types';

/**
 * Comprehensive messaging hook that combines all conversation and message operations.
 * 
 * This hook provides a complete messaging interface including conversation listing,
 * message sending, and read status management. Follows the platform pattern of
 * consolidated entity hooks. Must be used within a BelongProvider context.
 * 
 * @param userId - The ID of the current user (optional, but required for conversations)
 * @param options - Configuration options for the hook behavior
 * @returns Complete messaging interface with queries and mutations
 * 
 * @example
 * ```tsx
 * function MessagingApp() {
 *   const { currentUser } = useAuth();
 *   const {
 *     conversations,
 *     sendMessage,
 *     markAsRead,
 *     isLoading
 *   } = useMessaging(currentUser?.id);
 * 
 *   const handleSendMessage = async (conversationId, content) => {
 *     try {
 *       await sendMessage.mutateAsync({
 *         conversationId,
 *         content
 *       });
 *     } catch (error) {
 *       console.error('Failed to send message:', error);
 *     }
 *   };
 * 
 *   if (isLoading) return <div>Loading conversations...</div>;
 * 
 *   return (
 *     <div>
 *       {conversations?.map(conversation => (
 *         <div key={conversation.id}>
 *           {conversation.lastMessagePreview}
 *           {conversation.unreadCount > 0 && (
 *             <span>({conversation.unreadCount})</span>
 *           )}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // Messaging without auto-loading conversations
 * function MessageComposer() {
 *   const { sendMessage } = useMessaging(undefined, { 
 *     includeConversations: false 
 *   });
 * 
 *   const startNewConversation = async (recipientId, message) => {
 *     await sendMessage.mutateAsync({
 *       recipientId,
 *       content: message
 *     });
 *   };
 * 
 *   return <div>{/\* Message composer UI *\/}</div>;
 * }
 * ```
 * 
 * @category React Hooks
 */
export function useMessaging(userId?: string, options?: { includeConversations?: boolean }) {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const conversationsService = createConversationsService(supabase);

  // Default conversations query (most common use case)
  const conversationsQuery = useQuery<ConversationInfo[], Error>({
    queryKey: queryKeys.conversations.userList(userId || ''),
    queryFn: () => {
      if (!userId) throw new Error('User ID required');
      return conversationsService.fetchConversations(userId);
    },
    enabled: !!userId && (options?.includeConversations !== false),
    staleTime: 30 * 1000, // 30 seconds
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (data: MessageData) => conversationsService.sendMessage(data),
    onSuccess: (message) => {
      // Invalidate conversations list to update last message
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.userList(userId || '') });
      // Invalidate messages for this conversation
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.messages(message.conversationId) });
      
      logger.info('💬 useMessaging: Successfully sent message', {
        id: message.id,
        conversationId: message.conversationId,
      });
    },
    onError: (error) => {
      logger.error('💬 useMessaging: Failed to send message', { error });
    },
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (messageId: string) => conversationsService.markAsRead(messageId),
    onSuccess: (_, messageId) => {
      // Invalidate all conversations and messages queries since read status affects unread counts
      queryClient.invalidateQueries({ queryKey: ['user', userId, 'conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversations', 'messages'] });
      
      logger.info('💬 useMessaging: Successfully marked message as read', {
        messageId,
      });
    },
    onError: (error) => {
      logger.error('💬 useMessaging: Failed to mark message as read', { error });
    },
  });

  const result = {
    // Query data
    conversations: conversationsQuery.data,
    isLoading: conversationsQuery.isLoading,
    error: conversationsQuery.error,

    // Mutations - type-safe wrapper functions to prevent parameter misuse
    sendMessage: (data: MessageData) => {
      return sendMessageMutation?.mutateAsync ? sendMessageMutation.mutateAsync(data) : Promise.reject(new Error('Send message mutation not ready'));
    },
    markAsRead: (messageId: string) => {
      return markAsReadMutation?.mutateAsync ? markAsReadMutation.mutateAsync(messageId) : Promise.reject(new Error('Mark as read mutation not ready'));
    },

    // Mutation states (with defensive null checks)
    isSending: sendMessageMutation?.isPending || false,
    isMarkingAsRead: markAsReadMutation?.isPending || false,
    sendError: sendMessageMutation?.error,
    markAsReadError: markAsReadMutation?.error,

    // Raw queries for advanced usage
    conversationsQuery,
  };
  
  return result;
}