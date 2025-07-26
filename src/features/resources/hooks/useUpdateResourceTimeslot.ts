import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { updateResourceTimeslot } from '../api';
import { ResourceTimeslot, ResourceTimeslotInput } from '../types';
import { resourceTimeslotKeys } from '../queries';

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
      if (timeslot) {
        queryClient.invalidateQueries({
          queryKey: resourceTimeslotKeys.listByResource(timeslot.resourceId),
        });
      }
    },
  });
}
