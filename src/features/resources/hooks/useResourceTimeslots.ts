import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { fetchResourceTimeslots } from '../api';
import { ResourceTimeslot } from '../types';

export function useResourceTimeslots(resourceId: string) {
  const supabase = useSupabase();

  return useQuery<ResourceTimeslot[], Error>({
    queryKey: ['resource-timeslots', resourceId],
    queryFn: () => fetchResourceTimeslots(supabase, resourceId),
    enabled: !!resourceId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}