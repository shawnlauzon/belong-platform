import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '../../../shared/hooks';
import { blockUser } from '../api';
import { messageKeys } from '../queries';
import { BlockUserInput } from '../types';

export function useBlockUser() {
  const client = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: BlockUserInput) => blockUser(client, input),
    onSuccess: () => {
      // Invalidate blocked users list
      queryClient.invalidateQueries({
        queryKey: messageKeys.blockedUsers(),
      });
      
      // Invalidate conversations as blocked users' conversations should be hidden
      queryClient.invalidateQueries({
        queryKey: messageKeys.conversationList(),
      });
    },
  });
}