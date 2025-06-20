import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import type { Message, MessageData } from '@belongnetwork/types';
import { sendMessage } from '../impl/sendMessage';
import { queryKeys } from '../../shared/queryKeys';

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation<Message, Error, { messageData: MessageData; toUserId: string }>({
    mutationFn: ({ messageData, toUserId }) => sendMessage(messageData, toUserId),
    onSuccess: (newMessage) => {
      // Invalidate conversations list for both participants
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.messaging.conversations(newMessage.fromUserId)
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.messaging.conversations(newMessage.toUserId)
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