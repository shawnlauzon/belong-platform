import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useClient } from '../../auth/providers/CurrentUserProvider';
import { createMessagingService } from '../services/messaging.service';
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
 * Returns object with all messaging operations (queries and mutations)
 */
export function useMessaging(userId?: string) {
  const queryClient = useQueryClient();
  const client = useClient();
  const messagingService = createMessagingService(client);

  // Conversations query function
  const getConversations = (filters?: ConversationFilter) => {
    return useQuery<ConversationInfo[], Error>({
      queryKey: ['conversations', userId, filters],
      queryFn: () => {
        if (!userId) throw new Error('User ID required');
        return messagingService.fetchConversations(userId, filters);
      },
      enabled: !!userId,
      staleTime: 30 * 1000, // 30 seconds
    });
  };

  // Messages query function  
  const getMessages = (conversationId: string, filters?: MessageFilter) => {
    return useQuery<MessageInfo[], Error>({
      queryKey: ['messages', conversationId, filters],
      queryFn: () => messagingService.fetchMessages(conversationId, filters),
      enabled: !!conversationId,
      staleTime: 30 * 1000, // 30 seconds
    });
  };

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (data: MessageData) => messagingService.sendMessage(data),
    onSuccess: (message) => {
      // Invalidate conversations list to update last message
      queryClient.invalidateQueries({ queryKey: ['conversations', userId] });
      // Invalidate messages for this conversation
      queryClient.invalidateQueries({ queryKey: ['messages', message.conversationId] });
    },
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (messageId: string) => messagingService.markAsRead(messageId),
    onSuccess: () => {
      // Invalidate all conversations and messages queries since read status affects unread counts
      queryClient.invalidateQueries({ queryKey: ['conversations', userId] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });

  // Default conversations query (most common use case)
  const conversationsQuery = getConversations();

  return {
    // Query data
    conversations: conversationsQuery.data,
    isLoading: conversationsQuery.isPending,
    error: conversationsQuery.error,

    // Query functions
    getConversations,
    getMessages,

    // Mutations
    sendMessage: sendMessageMutation.mutateAsync,
    markAsRead: markAsReadMutation.mutateAsync,

    // Mutation states
    isSending: sendMessageMutation.isPending,
    isMarkingAsRead: markAsReadMutation.isPending,
    sendError: sendMessageMutation.error,
    markAsReadError: markAsReadMutation.error,

    // Sync mutations (don't return promises)
    sendMessageSync: sendMessageMutation.mutate,
    markAsReadSync: markAsReadMutation.mutate,

    // Reset functions
    resetSend: sendMessageMutation.reset,
    resetMarkAsRead: markAsReadMutation.reset,
  };
}