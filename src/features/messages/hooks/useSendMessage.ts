import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '../../../shared/hooks';
import { sendMessage } from '../api';
import { messageKeys } from '../queries';
import { SendMessageInput, Message } from '../types';

export function useSendMessage() {
  const client = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SendMessageInput) => sendMessage(client, input),
    onSuccess: (message: Message) => {
      // Invalidate and refetch messages for this conversation
      queryClient.invalidateQueries({
        queryKey: messageKeys.messages(message.conversationId),
      });
      
      // Invalidate conversation list to update last message
      queryClient.invalidateQueries({
        queryKey: messageKeys.conversations(),
      });
      
      // Invalidate specific conversation
      queryClient.invalidateQueries({
        queryKey: messageKeys.conversation(message.conversationId),
      });
    },
  });
}