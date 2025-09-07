import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '../../../shared/hooks';
import { startConversation } from '../api';
import { messageKeys } from '../queries';
import { StartConversationInput } from '../types';

export function useStartConversation() {
  const client = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: StartConversationInput) => 
      startConversation(client, input),
    onSuccess: (conversation) => {
      // Add the new conversation to the cache
      queryClient.setQueryData(
        messageKeys.conversation(conversation.id),
        conversation
      );
      
      // Invalidate conversations list to include new conversation
      queryClient.invalidateQueries({
        queryKey: messageKeys.conversationList(),
      });
    },
  });
}