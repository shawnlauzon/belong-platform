import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { updateConnection } from '../api';
import { connectionKeys } from '../queries';
import { useCurrentUser } from '@/features/auth';
import type { UpdateConnectionInput, UserConnection } from '../types';

export function useUpdateConnection() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  return useMutation({
    mutationFn: async (input: UpdateConnectionInput): Promise<UserConnection> => {
      if (!currentUser) {
        throw new Error('User must be authenticated to update connection');
      }
      return await updateConnection(supabase, currentUser.id, input);
    },
    onSuccess: () => {
      // Invalidate the user connections query to refetch with updated data
      queryClient.invalidateQueries({
        queryKey: connectionKeys.userConnections(),
      });
    },
  });
}
