import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { getMemberConnectionCode } from '../api';
import { connectionQueries } from '../queries';

export function useMemberConnectionCode(
  communityId: string,
  options?: Partial<UseQueryOptions<string, Error>>
) {
  const supabase = useSupabase();

  return useQuery({
    queryKey: connectionQueries.memberCode(communityId),
    queryFn: async (): Promise<string> => {
      const memberCode = await getMemberConnectionCode(supabase, communityId);
      return memberCode.code;
    },
    enabled: !!communityId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}