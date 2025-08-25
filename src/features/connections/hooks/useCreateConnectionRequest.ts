import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { createConnectionRequest } from '../api';
import { connectionQueries } from '../queries';
import type { ProcessConnectionLinkResponse } from '../types';

export function useCreateConnectionRequest() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string): Promise<ProcessConnectionLinkResponse> => {
      return await createConnectionRequest(supabase, code);
    },
    onSuccess: () => {
      // Invalidate pending connections to show new request
      queryClient.invalidateQueries({
        queryKey: connectionQueries.all,
      });
    },
  });
}