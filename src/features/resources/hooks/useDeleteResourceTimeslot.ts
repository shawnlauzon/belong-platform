import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { deleteResourceTimeslot } from '../api';

export function useDeleteResourceTimeslot() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { id: string; resourceId: string }
  >({
    mutationFn: ({ id }) => deleteResourceTimeslot(supabase, id),
    onSuccess: (_, { resourceId }) => {
      // Invalidate the timeslots query for this resource
      queryClient.invalidateQueries({
        queryKey: ['resource-timeslots', resourceId],
      });
    },
  });
}