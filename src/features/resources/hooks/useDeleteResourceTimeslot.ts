import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { deleteResourceTimeslot } from '../api';
import { resourceTimeslotKeys } from '../queries';
import { ResourceTimeslot } from '../types';

export function useDeleteResourceTimeslot() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<ResourceTimeslot | null, Error, string>({
    mutationFn: (id) => deleteResourceTimeslot(supabase, id),
    onSuccess: (timeslot) => {
      // Invalidate the timeslots query for this resource
      if (timeslot) {
        queryClient.invalidateQueries({
          queryKey: resourceTimeslotKeys.list({
            resourceId: timeslot.resourceId,
          }),
        });
      }
    },
  });
}
