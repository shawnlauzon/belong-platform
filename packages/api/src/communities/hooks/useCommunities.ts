import { useQuery } from '@tanstack/react-query';
import type { CommunityInfo } from '@belongnetwork/types';
import { useSupabase } from '../../auth/providers/CurrentUserProvider';
import { createCommunityService } from '../services/community.service';

export function useCommunities(options?: { includeDeleted?: boolean }) {
  const supabase = useSupabase();
  const communityService = createCommunityService(supabase);
  
  return useQuery<CommunityInfo[], Error>({
    queryKey: ['communities', options],
    queryFn: () => communityService.fetchCommunities(options),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
