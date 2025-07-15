import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { deleteResourceClaim } from '../api';

export function useDeleteResourceClaim() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { id: string; resourceId: string }
  >({
    mutationFn: ({ id }) => deleteResourceClaim(supabase, id),
    onSuccess: (_, { resourceId }) => {
      // Invalidate the claims query for this resource
      queryClient.invalidateQueries({
        queryKey: ['resource-claims', resourceId],
      });
    },
  });
}