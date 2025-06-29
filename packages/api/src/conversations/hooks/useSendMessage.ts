import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import type { MessageInfo, MessageData } from '@belongnetwork/types';
import { useSupabase } from '../../auth/providers/CurrentUserProvider';
import { createConversationsService } from '../services/conversations.service';
import { queryKeys } from '../../shared/queryKeys';

export function useSendMessage() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const conversationsService = createConversationsService(supabase);

  return useMutation<MessageInfo, Error, MessageData>({
    mutationFn: (messageData) => conversationsService.sendMessage(messageData),
    onSuccess: (newMessage) => {
      // Invalidate all user conversations to reflect new message
      queryClient.invalidateQueries({ 
        queryKey: ['user', 'conversations']
      });

      // Invalidate messages for this conversation
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.conversations.messages(newMessage.conversationId)
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