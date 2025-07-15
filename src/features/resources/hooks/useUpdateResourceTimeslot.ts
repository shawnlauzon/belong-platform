import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { updateResourceTimeslot } from '../api';
import { ResourceTimeslot, ResourceTimeslotInput } from '../types';

export function useUpdateResourceTimeslot() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<
    ResourceTimeslot,
    Error,
    { id: string; update: Partial<ResourceTimeslotInput> }
  >({
    mutationFn: ({ id, update }) =>
      updateResourceTimeslot(supabase, id, update),
    onSuccess: (timeslot) => {
      // Invalidate the timeslots query for this resource
      queryClient.invalidateQueries({
        queryKey: ['resource-timeslots', timeslot.resourceId],
      });
    },
  });
}