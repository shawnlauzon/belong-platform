import { supabase } from '@belongnetwork/core';
import { logger } from '@belongnetwork/core';
import type { EventData, Event } from '@belongnetwork/types';
import { toDomainEvent, forDbInsert } from './eventTransformer';
import { fetchUserById } from '../../users/impl/fetchUserById';
import { fetchCommunityById } from '../../communities/impl/fetchCommunityById';
import { MESSAGE_AUTHENTICATION_REQUIRED } from '../../constants';

export async function createEvent(data: EventData): Promise<Event> {
  logger.debug('🎉 API: Creating event', {
    data: { ...data, coordinates: 'REDACTED' },
  });

  try {
    // Get current user
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user?.id) {
      logger.error('🎉 API: User must be authenticated to create an event', {
        error: userError,
      });
      throw new Error(MESSAGE_AUTHENTICATION_REQUIRED);
    }

    const userId = userData.user.id;

    // Transform to database format
    const dbEvent = forDbInsert(data, userId);

    // Insert into database
    const { data: createdEvent, error } = await supabase
      .from('events')
      .insert([dbEvent])
      .select('*')
      .single();

    if (error) {
      logger.error('🎉 API: Failed to create event', { error });
      throw error;
    }

    // Fetch organizer and community from cache
    const [organizer, community] = await Promise.all([
      fetchUserById(createdEvent.organizer_id),
      fetchCommunityById(createdEvent.community_id),
    ]);

    if (!organizer) {
      throw new Error('Organizer not found');
    }
    if (!community) {
      throw new Error('Community not found');
    }

    // Transform to domain model
    const event = toDomainEvent(createdEvent, { organizer, community });

    logger.info('🎉 API: Successfully created event', {
      id: event.id,
      title: event.title,
      startDateTime: event.startDateTime,
    });

    return event;
  } catch (error) {
    logger.error('🎉 API: Error creating event', { error });
    throw error;
  }
}