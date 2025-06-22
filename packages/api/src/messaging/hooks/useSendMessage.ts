import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import type { MessageInfo, MessageData } from '@belongnetwork/types';
import { useSupabase } from '../../auth/providers/CurrentUserProvider';
import { createMessagingService } from '../services/messaging.service';
import { queryKeys } from '../../shared/queryKeys';

export function useSendMessage() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const messagingService = createMessagingService(supabase);

  return useMutation<MessageInfo, Error, MessageData>({
    mutationFn: (messageData) => messagingService.sendMessage(messageData),
    onSuccess: (newMessage) => {
      // Invalidate conversations list for the current user
      // Note: We can't easily get both participant IDs here, so we'll invalidate based on conversation
      queryClient.invalidateQueries({ 
        queryKey: ['messaging', 'conversations']
      });

      // Invalidate messages for this conversation
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.messaging.messages(newMessage.conversationId)
      });

      logger.info('💬 useSendMessage: Successfully sent message', {
        id: newMessage.id,
        conversationId: newMessage.conversationId,
      });
    },
    onError: (error) => {
      logger.error('💬 useSendMessage: Failed to send message', { error });
    },
  });
}