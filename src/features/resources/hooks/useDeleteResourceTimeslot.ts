import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { deleteResourceTimeslot } from '../api';
import { resourceKeys, resourceTimeslotKeys } from '../queries';
import { ResourceTimeslot } from '../types';

export function useDeleteResourceTimeslot() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<ResourceTimeslot | null, Error, string>({
    mutationFn: (id: string) => deleteResourceTimeslot(supabase, id),
    onSuccess: (timeslot: ResourceTimeslot | null) => {
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
