import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '../../auth/providers/CurrentUserProvider';
import { createCommunityService } from '../services/community.service';

export function useCommunity(id: string, options?: { includeDeleted?: boolean }) {
  const supabase = useSupabase();
  const communityService = createCommunityService(supabase);
  
  return useQuery({
    queryKey: ['communities', id, options],
    queryFn: () => communityService.fetchCommunityById(id, options),
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
