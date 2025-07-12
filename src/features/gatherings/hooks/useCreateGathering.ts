import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger, queryKeys } from '@/shared';
import { useSupabase } from '@/shared';
import { createGathering } from '../api';
import { useCurrentUser } from '@/features/auth';

import type { Gathering, GatheringInput } from '../types';

/**
 * Hook for creating a new gathering.
 *
 * Provides a mutation function for creating gatherings.
 * Returns Gathering (with ID references) rather than full composed Gathering object.
 * Automatically invalidates gathering caches on successful creation.
 *
 * @returns React Query mutation result with create function and state
 *
 * @example
 * ```tsx
 * function CreateGatheringForm({ communityId }) {
 *   const { mutate, isLoading, error } = useCreateGathering();
 *   const [formData, setFormData] = useState({
 *     title: '',
 *     description: '',
 *     communityId,
 *     startDateTime: new Date(),
 *     isAllDay: false,
 *     locationName: '',
 *     coordinates: { lat: 0, lng: 0 },
 *   });
 *
 *   const handleSubmit = (e) => {
 *     e.preventDefault();
 *     mutate(formData, {
 *       onSuccess: (gatheringInfo) => {
 *         console.log('Created gathering:', gatheringInfo.title);
 *         router.push(`/gatherings/${gatheringInfo.id}`);
 *       },
 *       onError: (error) => {
 *         console.error('Failed to create gathering:', error);
 *       }
 *     });
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <input
 *         value={formData.title}
 *         onChange={(e) => setFormData({...formData, title: e.target.value})}
 *         placeholder="Gathering title"
 *       />
 *       <textarea
 *         value={formData.description}
 *         onChange={(e) => setFormData({...formData, description: e.target.value})}
 *         placeholder="Gathering description"
 *       />
 *       <input
 *         type="datetime-local"
 *         value={formData.startDateTime.toISOString().slice(0, 16)}
 *         onChange={(e) => setFormData({...formData, startDateTime: new Date(e.target.value)})}
 *       />
 *       <button type="submit" disabled={isLoading}>
 *         {isLoading ? 'Creating...' : 'Create Gathering'}
 *       </button>
 *       {error && <div className="error">{error.message}</div>}
 *     </form>
 *   );
 * }
 * ```
 */
export function useCreateGathering() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const currentUser = useCurrentUser();

  const mutation = useMutation({
    mutationFn: async (data: GatheringInput): Promise<Gathering> => {
      if (!currentUser?.data?.id) {
        throw new Error('User must be authenticated to create gatherings');
      }

      // Create the gathering (auto-commits images internally)
      const result = await createGathering(supabase, data);
      if (!result) {
        throw new Error('Failed to create gathering');
      }

      return result;
    },
    onSuccess: (newGathering: Gathering) => {
      // Invalidate all gatherings queries
      queryClient.invalidateQueries({ queryKey: ['gatherings'] });

      // Invalidate the specific gathering to force fresh fetch with nested objects
      queryClient.invalidateQueries({
        queryKey: queryKeys.gatherings.byId(newGathering.id),
      });

      logger.info('📅 API: Successfully created gathering', {
        id: newGathering.id,
        title: newGathering.title,
      });
    },
    onError: (error) => {
      logger.error('📅 API: Failed to create gathering', { error });
    },
  });

  return mutation;
}