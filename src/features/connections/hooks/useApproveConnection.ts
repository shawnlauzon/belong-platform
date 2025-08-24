import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { approveConnection } from '../api';
import { connectionQueries } from '../queries';
import type { UserConnection } from '../types';

export function useApproveConnection() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string): Promise<UserConnection> => {
      return await approveConnection(supabase, requestId);
    },
    onSuccess: (connection) => {
      // Invalidate all connection queries to refresh state
      queryClient.invalidateQueries({
        queryKey: connectionQueries.all,
      });

      // Optimistically update user connections for the community
      const userConnectionsKey = connectionQueries.userConnections(connection.communityId);
      queryClient.setQueryData(userConnectionsKey, (old: UserConnection[] = []) => {
        return [connection, ...old];
      });
    },
  });
}