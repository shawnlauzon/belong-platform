import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { processConnectionLink } from '../api';
import { connectionQueries } from '../queries';
import type { ProcessConnectionLinkResponse } from '../types';

export function useProcessConnectionLink() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string): Promise<ProcessConnectionLinkResponse> => {
      return await processConnectionLink(supabase, code);
    },
    onSuccess: () => {
      // Invalidate pending connections to show new request
      queryClient.invalidateQueries({
        queryKey: connectionQueries.all,
      });
    },
  });
}