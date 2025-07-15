import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { createResourceTimeslot } from '../api';
import { ResourceTimeslot, ResourceTimeslotInput } from '../types';

export function useCreateResourceTimeslot() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<ResourceTimeslot, Error, ResourceTimeslotInput>({
    mutationFn: (timeslotInput: ResourceTimeslotInput) =>
      createResourceTimeslot(supabase, timeslotInput),
    onSuccess: (timeslot) => {
      // Invalidate the timeslots query for this resource
      queryClient.invalidateQueries({
        queryKey: ['resource-timeslots', timeslot.resourceId],
      });
    },
  });
}