import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '../../../shared/hooks';
import { deleteMessage } from '../api';
import { messageKeys } from '../queries';
import { DeleteMessageInput } from '../types';

export function useDeleteMessage(conversationId: string) {
  const client = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DeleteMessageInput) => deleteMessage(client, input),
    onSuccess: () => {
      // Invalidate messages for this conversation
      queryClient.invalidateQueries({
        queryKey: messageKeys.list(conversationId),
      });
      
      // Invalidate conversation to update last message if needed
      queryClient.invalidateQueries({
        queryKey: messageKeys.conversation(conversationId),
      });
    },
  });
}