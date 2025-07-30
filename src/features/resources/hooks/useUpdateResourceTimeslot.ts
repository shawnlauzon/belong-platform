import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { updateResourceTimeslot } from '../api';
import { ResourceTimeslot, ResourceTimeslotInput } from '../types';
import { resourceKeys, resourceTimeslotKeys } from '../queries';

export function useUpdateResourceTimeslot() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<
    ResourceTimeslot,
    Error,
    Partial<ResourceTimeslotInput> & { id: string }
  >({
    mutationFn: (update) => updateResourceTimeslot(supabase, update),
    onSuccess: (timeslot) => {
      if (timeslot) {
        queryClient.invalidateQueries({
          queryKey: resourceTimeslotKeys.listByResource(timeslot.resourceId),
        });

        // We include timeslots in the resource detail query
        queryClient.invalidateQueries({
          queryKey: resourceKeys.detail(timeslot.resourceId),
        });
      }
    },
  });
}
