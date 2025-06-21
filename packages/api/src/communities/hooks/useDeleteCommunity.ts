import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import { useSupabase } from '../../auth/providers/CurrentUserProvider';
import { createCommunityService } from '../services/community.service';

export function useDeleteCommunity() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const communityService = createCommunityService(supabase);

  return useMutation({
    mutationFn: (id: string) => communityService.deleteCommunity(id),
    onSuccess: (_, id) => {
      // Remove the community from the cache
      queryClient.removeQueries({ queryKey: ['communities', id] });
      
      // Invalidate the communities list to reflect the deletion
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      
      logger.info('🏘️ API: Successfully deleted community via hook', { id });
    },
    onError: (error, id) => {
      logger.error('🏘️ API: Failed to delete community via hook', { id, error });
    },
  });
}
