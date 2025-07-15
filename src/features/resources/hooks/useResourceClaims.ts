import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { fetchResourceClaims, ResourceClaimFilter } from '../api';
import { ResourceClaim } from '../types';

export function useResourceClaims(filter: ResourceClaimFilter = {}) {
  const supabase = useSupabase();

  return useQuery<ResourceClaim[], Error>({
    queryKey: ['resource-claims', filter],
    queryFn: () => fetchResourceClaims(supabase, filter),
    enabled: !!filter.resourceId || !!filter.userId || !!filter.status || !!filter.timeslotId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}