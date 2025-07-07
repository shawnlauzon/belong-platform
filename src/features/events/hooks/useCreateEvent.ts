import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { logger, queryKeys } from '@/shared';
import { useSupabase } from '@/shared';
import { useImageCommit } from '@/features/images';
import { createEvent } from '@/features/events/api';
import { useCurrentUser } from '@/features/auth';

import type { EventInfo, EventData } from '@/features/events/types';

/**
 * Hook for creating a new event.
 *
 * Provides a mutation function for creating events.
 * Returns EventInfo (with ID references) rather than full composed Event object.
 * Automatically invalidates event caches on successful creation.
 *
 * @returns React Query mutation result with create function and state
 *
 * @example
 * ```tsx
 * function CreateEventForm({ communityId }) {
 *   const { mutate, isLoading, error } = useCreateEvent();
 *   const [formData, setFormData] = useState({
 *     title: '',
 *     description: '',
 *     communityId,
 *     startDateTime: new Date(),
 *     isAllDay: false,
 *     location: '',
 *     coordinates: { lat: 0, lng: 0 },
 *     registrationRequired: false,
 *   });
 *
 *   const handleSubmit = (e) => {
 *     e.preventDefault();
 *     mutate(formData, {
 *       onSuccess: (eventInfo) => {
 *         console.log('Created event:', eventInfo.title);
 *         // To get full composed Event with organizer and community objects:
 *         // const fullEvent = useEvent(eventInfo.id);
 *         router.push(`/events/${eventInfo.id}`);
 *       },
 *       onError: (error) => {
 *         console.error('Failed to create event:', error);
 *       }
 *     });
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <input
 *         value={formData.title}
 *         onChange={(e) => setFormData({...formData, title: e.target.value})}
 *         placeholder="Event title"
 *       />
 *       <textarea
 *         value={formData.description}
 *         onChange={(e) => setFormData({...formData, description: e.target.value})}
 *         placeholder="Event description"
 *       />
 *       <input
 *         type="datetime-local"
 *         value={formData.startDateTime.toISOString().slice(0, 16)}
 *         onChange={(e) => setFormData({...formData, startDateTime: new Date(e.target.value)})}
 *       />
 *       <button type="submit" disabled={isLoading}>
 *         {isLoading ? 'Creating...' : 'Create Event'}
 *       </button>
 *       {error && <div className="error">{error.message}</div>}
 *     </form>
 *   );
 * }
 * ```
 */
export function useCreateEvent() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const currentUser = useCurrentUser();
  const commitImages = useImageCommit();

  const mutation = useMutation({
    mutationFn: async (data: EventData): Promise<EventInfo> => {
      if (!currentUser?.data?.id) {
        throw new Error('User must be authenticated to create events');
      }

      // Create the event (returns EventInfo)
      const result = await createEvent(supabase, data);
      if (!result) {
        throw new Error('Failed to create event');
      }

      // Commit any temporary images to permanent storage
      if (data.imageUrls && data.imageUrls.length > 0) {
        logger.debug('📅 API: Committing event images', {
          eventId: result.id,
          imageCount: data.imageUrls.length,
        });

        try {
          const { permanentUrls } = await commitImages.mutateAsync({
            imageUrls: data.imageUrls,
            entityType: 'event',
            entityId: result.id,
          });

          // Update the event with permanent image URLs if they changed
          if (JSON.stringify(permanentUrls) !== JSON.stringify(data.imageUrls)) {
            // Import updateEvent API here to avoid circular dependency
            const { updateEvent } = await import('@/features/events/api');
            
            const updatedEvent = await updateEvent(supabase, result.id, {
              imageUrls: permanentUrls,
            });

            if (updatedEvent) {
              // Return the updated event with permanent URLs
              return updatedEvent;
            }
          }
        } catch (error) {
          logger.error('📅 API: Failed to commit event images', {
            eventId: result.id,
            error,
          });
          // Continue without throwing - event was created successfully
          // We'll leave the temp URLs in place and rely on cleanup service
        }
      }

      return result;
    },
    onSuccess: (newEventInfo: EventInfo) => {
      // Invalidate all events queries
      queryClient.invalidateQueries({ queryKey: ['events'] });

      // Cache the EventInfo for potential useEvent calls
      queryClient.setQueryData(
        queryKeys.events.byId(newEventInfo.id),
        newEventInfo,
      );

      logger.info('📅 API: Successfully created event', {
        id: newEventInfo.id,
        title: newEventInfo.title,
      });
    },
    onError: (error) => {
      logger.error('📅 API: Failed to create event', { error });
    },
  });

  // Return mutation with stable function references
  return {
    ...mutation,
    mutate: useCallback(
      (...args: Parameters<typeof mutation.mutate>) => {
        return mutation.mutate(...args);
      },
      [mutation],
    ),
    mutateAsync: useCallback(
      (...args: Parameters<typeof mutation.mutateAsync>) => {
        return mutation.mutateAsync(...args);
      },
      [mutation],
    ),
  };
}