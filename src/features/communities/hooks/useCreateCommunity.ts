import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger, queryKeys } from '../../../shared';
import { useSupabase } from '../../../shared';
import { createCommunityService } from '../services/community.service';

import type { CommunityData } from '../types/domain';

/**
 * Hook for creating a new community.
 * 
 * Provides a mutation function for creating communities.
 * Automatically invalidates community caches on successful creation.
 * 
 * @returns Create community mutation function
 * 
 * @example
 * ```tsx
 * function CreateCommunityForm() {
 *   const createCommunity = useCreateCommunity();
 *   const [formData, setFormData] = useState({
 *     name: '',
 *     description: '',
 *     category: 'social',
 *     organizerId: 'user-123',
 *     isActive: true
 *   });
 *   
 *   const handleSubmit = async (e) => {
 *     e.preventDefault();
 *     try {
 *       const community = await createCommunity(formData);
 *       console.log('Created community:', community.name);
 *       // Redirect to community page
 *     } catch (error) {
 *       console.error('Failed to create community:', error);
 *     }
 *   };
 *   
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <input 
 *         value={formData.name} 
 *         onChange={(e) => setFormData({...formData, name: e.target.value})} 
 *       />
 *       <textarea 
 *         value={formData.description} 
 *         onChange={(e) => setFormData({...formData, description: e.target.value})} 
 *       />
 *       <button type="submit">Create Community</button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useCreateCommunity() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const communityService = createCommunityService(supabase);

  const mutation = useMutation({
    mutationFn: (data: CommunityData) => communityService.createCommunity(data),
    onSuccess: (newCommunity, data) => {
      // Invalidate all communities queries
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      
      // Also invalidate membership queries since organizer is auto-added as member
      queryClient.invalidateQueries({
        queryKey: queryKeys.communities.memberships(newCommunity.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.communities.userMemberships(data.organizerId),
      });

      logger.info('🏘️ API: Successfully created community', {
        id: newCommunity.id,
        name: newCommunity.name,
      });
    },
    onError: (error) => {
      logger.error('🏘️ API: Failed to create community', { error });
    },
  });

  // Return stable function reference
  return useCallback(
    (data: CommunityData) => {
      return mutation.mutateAsync(data);
    },
    [mutation.mutateAsync]
  );
}