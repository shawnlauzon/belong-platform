import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { fetchResourceTimeslots } from '../api';
import { ResourceTimeslot } from '../types';
import { ResourceTimeslotFilter } from '../types/resourceTimeslotFilter';
import { UseQueryOptions } from '@tanstack/react-query';
import { STANDARD_CACHE_TIME } from '@/config';
import { resourceTimeslotKeys } from '../queries';

export function useResourceTimeslots(
  filter?: ResourceTimeslotFilter,
  options?: UseQueryOptions<ResourceTimeslot[], Error>,
) {
  const supabase = useSupabase();

  return useQuery<ResourceTimeslot[], Error>({
    queryKey: filter
      ? resourceTimeslotKeys.list(filter)
      : resourceTimeslotKeys.all,
    queryFn: () => fetchResourceTimeslots(supabase, filter),
    staleTime: STANDARD_CACHE_TIME,
    ...options,
  });
}
