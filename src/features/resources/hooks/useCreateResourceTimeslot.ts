import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { createResourceTimeslot } from '../api';
import { ResourceTimeslot, ResourceTimeslotInput } from '../types';
import { resourceKeys, resourceTimeslotKeys } from '../queries';

export function useCreateResourceTimeslot() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<ResourceTimeslot, Error, ResourceTimeslotInput>({
    mutationFn: (timeslotInput: ResourceTimeslotInput) =>
      createResourceTimeslot(supabase, timeslotInput),
    onSuccess: (timeslot) => {
      queryClient.invalidateQueries({
        queryKey: resourceTimeslotKeys.listByResource(timeslot.resourceId),
      });

      // We include timeslots in the resource detail query
      queryClient.invalidateQueries({
        queryKey: resourceKeys.detail(timeslot.resourceId),
      });
    },
  });
}
