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
 * Consolidated Messaging Hook
 * Following the new architecture pattern of single hook per entity
 * Returns object with all conversation operations (queries and mutations)
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

    // Mutations (with defensive null checks for testing environments)
    sendMessage: sendMessageMutation?.mutateAsync || (() => Promise.reject(new Error('Send message mutation not ready'))),
    markAsRead: markAsReadMutation?.mutateAsync || (() => Promise.reject(new Error('Mark as read mutation not ready'))),

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