import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger, queryKeys } from '@/shared';
import { useSupabase } from '@/shared';
import { updateGathering } from '../api';

import type { GatheringInput, Gathering } from '../types';

/**
 * Hook for updating an existing gathering.
 *
 * Provides a mutation function for updating gathering information.
 * Automatically invalidates gathering caches on successful update.
 *
 * @returns React Query mutation result with update function and state
 *
 * @example
 * ```tsx
 * function EditGatheringForm({ gatheringId }) {
 *   const { mutate: updateGathering, isLoading, error } = useUpdateGathering();
 *   const { data: gathering } = useGathering(gatheringId);
 *   const [formData, setFormData] = useState({
 *     title: gathering?.title || '',
 *     description: gathering?.description || '',
 *     startDateTime: gathering?.startDateTime || new Date(),
 *     locationName: gathering?.locationName || ''
 *   });
 *
 *   const handleSubmit = (e) => {
 *     e.preventDefault();
 *     updateGathering({ id: gatheringId, ...formData }, {
 *       onSuccess: () => {
 *         // Gathering updated successfully
 *       },
 *       onError: (error) => {
 *         console.error('Failed to update gathering:', error);
 *       }
 *     });
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <input
 *         value={formData.title}
 *         onChange={(e) => setFormData({...formData, title: e.target.value})}
 *       />
 *       <textarea
 *         value={formData.description}
 *         onChange={(e) => setFormData({...formData, description: e.target.value})}
 *       />
 *       <input
 *         type="datetime-local"
 *         value={formData.startDateTime.toISOString().slice(0, 16)}
 *         onChange={(e) => setFormData({...formData, startDateTime: new Date(e.target.value)})}
 *       />
 *       <button type="submit" disabled={isLoading}>
 *         {isLoading ? 'Updating...' : 'Update Gathering'}
 *       </button>
 *       {error && <div className="error">{error.message}</div>}
 *     </form>
 *   );
 * }
 * ```
 */
export function useUpdateGathering() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();

  const mutation = useMutation({
    mutationFn: async (
      updateData: Partial<GatheringInput> & { id: string }
    ): Promise<Gathering> => {
      const result = await updateGathering(supabase, updateData);
      if (!result) {
        throw new Error('Failed to update gathering');
      }
      return result;
    },
    onSuccess: (updatedGathering: Gathering) => {
      // Invalidate all gatherings queries
      queryClient.invalidateQueries({ queryKey: ['gatherings'] });

      // Invalidate the specific gathering to force fresh fetch with nested objects
      queryClient.invalidateQueries({
        queryKey: queryKeys.gatherings.byId(updatedGathering.id),
      });

      logger.info('📅 API: Successfully updated gathering', {
        id: updatedGathering.id,
        title: updatedGathering.title,
      });
    },
    onError: (error) => {
      logger.error('📅 API: Failed to update gathering', { error });
    },
  });

  return mutation;
}