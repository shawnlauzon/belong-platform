import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { fetchPendingConnections } from '../api';
import { connectionQueries } from '../queries';
import type { ConnectionRequest } from '../types';

export function usePendingConnections(communityId?: string) {
  const supabase = useSupabase();

  return useQuery({
    queryKey: connectionQueries.pendingConnections(communityId),
    queryFn: async (): Promise<ConnectionRequest[]> => {
      return await fetchPendingConnections(supabase, communityId);
    },
    staleTime: 30 * 1000, // 30 seconds - shorter for real-time feel
    gcTime: 2 * 60 * 1000, // 2 minutes
  });
}