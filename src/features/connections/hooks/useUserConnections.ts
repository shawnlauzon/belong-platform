import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { fetchUserConnections } from '../api';
import { connectionKeys } from '../queries';
import type { UserConnection } from '../types';
import { useCurrentUser } from '@/features/auth';

export function useUserConnections(
  communityId: string,
  options?: Partial<UseQueryOptions<UserConnection[], Error>>
) {
  const supabase = useSupabase();
  const { data: currentUser } = useCurrentUser();

  return useQuery({
    queryKey: connectionKeys.userConnections(communityId),
    queryFn: async (): Promise<UserConnection[]> => {
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      return await fetchUserConnections(supabase, currentUser.id, communityId);
    },
    enabled: !!communityId && !!currentUser,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}