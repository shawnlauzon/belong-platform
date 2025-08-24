import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { rejectConnection } from '../api';
import { connectionQueries } from '../queries';
import type { ConnectionRequest } from '../types';

export function useRejectConnection() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string): Promise<void> => {
      return await rejectConnection(supabase, requestId);
    },
    onSuccess: (_, requestId) => {
      // Remove the request from pending connections
      queryClient.setQueryData(
        connectionQueries.pendingConnections(),
        (old: ConnectionRequest[] = []) => {
          return old.filter((request) => request.id !== requestId);
        },
      );

      // Invalidate to ensure consistency
      queryClient.invalidateQueries({
        queryKey: connectionQueries.all,
      });
    },
  });
}