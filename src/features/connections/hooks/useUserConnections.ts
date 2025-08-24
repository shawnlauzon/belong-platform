import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { fetchUserConnections } from '../api';
import { connectionQueries } from '../queries';
import type { UserConnection } from '../types';

export function useUserConnections(communityId: string) {
  const supabase = useSupabase();

  return useQuery({
    queryKey: connectionQueries.userConnections(communityId),
    queryFn: async (): Promise<UserConnection[]> => {
      return await fetchUserConnections(supabase, communityId);
    },
    enabled: !!communityId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}