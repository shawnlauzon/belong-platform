import { supabase } from '@belongnetwork/core';
import { logger } from '@belongnetwork/core';
import type { EventData, Event } from '@belongnetwork/types';
import { toDomainEvent, forDbUpdate } from './eventTransformer';
import { fetchUserById } from '../../users/impl/fetchUserById';
import { fetchCommunityById } from '../../communities/impl/fetchCommunityById';
import { MESSAGE_AUTHENTICATION_REQUIRED } from '../../constants';

export async function updateEvent(
  id: string,
  data: Partial<EventData>
): Promise<Event> {
  logger.debug('🎉 API: Updating event', { id, data });

  try {
    // Get current user
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user?.id) {
      logger.error('🎉 API: User must be authenticated to update an event', {
        error: userError,
      });
      throw new Error(MESSAGE_AUTHENTICATION_REQUIRED);
    }

    const userId = userData.user.id;

    // Transform to database format
    const dbEvent = forDbUpdate(data, userId);

    // Update in database
    const { data: updatedEvent, error } = await supabase
      .from('events')
      .update(dbEvent)
      .eq('id', id)
      .eq('organizer_id', userId) // Only allow organizer to update
      .select('*')
      .single();

    if (error) {
      logger.error('🎉 API: Failed to update event', { id, error });
      throw error;
    }

    if (!updatedEvent) {
      logger.error('🎉 API: Event not found or not authorized to update', { id });
      throw new Error('Event not found or not authorized to update');
    }

    // Fetch organizer and community from cache
    const [organizer, community] = await Promise.all([
      fetchUserById(updatedEvent.organizer_id),
      fetchCommunityById(updatedEvent.community_id),
    ]);

    if (!organizer) {
      throw new Error('Organizer not found');
    }
    if (!community) {
      throw new Error('Community not found');
    }

    // Transform to domain model
    const event = toDomainEvent(updatedEvent, { organizer, community });

    logger.info('🎉 API: Successfully updated event', {
      id: event.id,
      title: event.title,
    });

    return event;
  } catch (error) {
    logger.error('🎉 API: Error updating event', { id, error });
    throw error;
  }
}