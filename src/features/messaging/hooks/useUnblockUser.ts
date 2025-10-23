import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '../../../shared/hooks';
import { getAuthIdOrThrow } from '../../../shared';
import { unblockUser } from '../api';
import { conversationKeys, messageKeys } from '../queries';
import { UnblockUserInput } from '../types';

export function useUnblockUser() {
  const client = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UnblockUserInput) => {
      const userId = await getAuthIdOrThrow(client, 'unblock user');
      return unblockUser(client, userId, input);
    },
    onSuccess: () => {
      // Invalidate blocked users list
      queryClient.invalidateQueries({
        queryKey: messageKeys.blockedUsers(),
      });

      // Invalidate conversations as unblocked users' conversations may reappear
      queryClient.invalidateQueries({
        queryKey: conversationKeys.lists(),
      });
    },
  });
}
