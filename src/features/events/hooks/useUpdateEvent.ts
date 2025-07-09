import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger, queryKeys } from '@/shared';
import { useSupabase } from '@/shared';
import { updateEvent } from '@/features/events/api';

import type { EventData, EventInfo } from '@/features/events/types';

/**
 * Hook for updating an existing event.
 *
 * Provides a mutation function for updating event information.
 * Automatically invalidates event caches on successful update.
 *
 * @returns React Query mutation result with update function and state
 *
 * @example
 * ```tsx
 * function EditEventForm({ eventId }) {
 *   const { mutate: updateEvent, isLoading, error } = useUpdateEvent();
 *   const { data: event } = useEvent(eventId);
 *   const [formData, setFormData] = useState({
 *     title: event?.title || '',
 *     description: event?.description || '',
 *     startDateTime: event?.startDateTime || new Date(),
 *     location: event?.location || ''
 *   });
 *
 *   const handleSubmit = (e) => {
 *     e.preventDefault();
 *     updateEvent({ id: eventId, ...formData }, {
 *       onSuccess: () => {
 *         // Event updated successfully
 *       },
 *       onError: (error) => {
 *         console.error('Failed to update event:', error);
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
 *         {isLoading ? 'Updating...' : 'Update Event'}
 *       </button>
 *       {error && <div className="error">{error.message}</div>}
 *     </form>
 *   );
 * }
 * ```
 */
export function useUpdateEvent() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();

  const mutation = useMutation({
    mutationFn: async (
      updateData: Partial<EventData> & { id: string }
    ): Promise<EventInfo> => {
      const result = await updateEvent(supabase, updateData);
      if (!result) {
        throw new Error('Failed to update event');
      }
      return result;
    },
    onSuccess: (updatedEvent: EventInfo) => {
      // Invalidate all events queries
      queryClient.invalidateQueries({ queryKey: ['events'] });

      // Invalidate the specific event to force fresh fetch with nested objects
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.byId(updatedEvent.id),
      });

      logger.info('📅 API: Successfully updated event', {
        id: updatedEvent.id,
        title: updatedEvent.title,
      });
    },
    onError: (error) => {
      logger.error('📅 API: Failed to update event', { error });
    },
  });

  return mutation;
}