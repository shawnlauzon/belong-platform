import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { getMemberConnectionCode } from '../api';
import { toConnectionLink } from '../transformers';
import { connectionQueries } from '../queries';
import type { ConnectionLink } from '../types';

export function useMemberConnectionCode(
  communityId: string,
  baseUrl?: string,
  options?: Partial<UseQueryOptions<ConnectionLink, Error>>
) {
  const supabase = useSupabase();

  return useQuery({
    queryKey: connectionQueries.memberCode(communityId),
    queryFn: async (): Promise<ConnectionLink> => {
      const memberCode = await getMemberConnectionCode(supabase, communityId);
      return toConnectionLink(memberCode, baseUrl);
    },
    enabled: !!communityId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}