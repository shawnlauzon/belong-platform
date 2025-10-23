import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '../../../shared/hooks';
import { getAuthIdOrThrow } from '../../../shared';
import { blockUser } from '../api';
import { messageKeys } from '../queries';
import { BlockUserInput } from '../types';

export function useBlockUser() {
  const client = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: BlockUserInput) => {
      const userId = await getAuthIdOrThrow(client, 'block user');
      return blockUser(client, userId, input);
    },
    onSuccess: () => {
      // Invalidate blocked users list
      queryClient.invalidateQueries({
        queryKey: messageKeys.blockedUsers(),
      });

      // Invalidate conversations as blocked users' conversations should be hidden
      queryClient.invalidateQueries({
        queryKey: messageKeys.lists(),
      });
    },
  });
}
