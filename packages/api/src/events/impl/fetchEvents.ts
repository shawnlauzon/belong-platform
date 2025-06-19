import { getBelongClient } from '@belongnetwork/core';
import type { Event, EventInfo, EventFilter } from '@belongnetwork/types';
import { toDomainEvent, toEventInfo } from './eventTransformer';
import { fetchUserById } from '../../users/impl/fetchUserById';
import { fetchCommunityById } from '../../communities/impl/fetchCommunityById';

export async function fetchEvents(filters?: EventFilter): Promise<EventInfo[]> {
  const { supabase, logger } = getBelongClient();
  
  logger.debug('🎉 API: Fetching events', { filters });

  try {
    let query = supabase
      .from('events')
      .select('*')
      .order('start_date_time', { ascending: true });

    // Apply filters if provided
    if (filters) {
      if (filters.communityId) {
        query = query.eq('community_id', filters.communityId);
      }
      if (filters.organizerId) {
        query = query.eq('organizer_id', filters.organizerId);
      }
      if (filters.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }
      if (filters.startDate) {
        query = query.gte('start_date_time', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        query = query.lte('start_date_time', filters.endDate.toISOString());
      }
      if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }
      if (filters.searchTerm) {
        query = query.or(
          `title.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%`
        );
      }
    }

    const { data, error } = await query;

    if (error) {
      logger.error('🎉 API: Failed to fetch events', { error });
      throw error;
    }

    if (!data) {
      return [];
    }

    // For EventInfo[], we only need IDs, not full objects
    const events = data
      .map((dbEvent) => {
        try {
          const organizerId = dbEvent.organizer_id;
          const communityId = dbEvent.community_id;
          
          if (!organizerId || !communityId) {
            logger.warn('🎉 API: Missing organizer or community ID for event', {
              eventId: dbEvent.id,
              organizerId: dbEvent.organizer_id,
              communityId: dbEvent.community_id,
            });
            return null;
          }

          return toEventInfo(dbEvent, organizerId, communityId);
        } catch (error) {
          logger.error('🎉 API: Error transforming event', {
            eventId: dbEvent.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          return null;
        }
      })
      .filter((event): event is EventInfo => event !== null);

    logger.debug('🎉 API: Successfully fetched events', {
      count: events.length,
    });
    return events;
  } catch (error) {
    logger.error('🎉 API: Error fetching events', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

export async function fetchEventById(id: string): Promise<Event | null> {
  const { supabase, logger } = getBelongClient();
  logger.debug('🎉 API: Fetching event by ID', { id });

  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        logger.debug('🎉 API: Event not found', { id });
        return null;
      }
      logger.error('🎉 API: Failed to fetch event by ID', {
        id,
        error: error.message,
        code: error.code,
      });
      throw error;
    }

    if (!data) {
      logger.debug('🎉 API: Event not found (null data)', { id });
      return null;
    }

    try {
      // Fetch organizer and community separately
      const [organizer, community] = await Promise.all([
        fetchUserById(data.organizer_id),
        fetchCommunityById(data.community_id)
      ]);

      if (!organizer || !community) {
        logger.error('🎉 API: Missing organizer or community for event', {
          id,
          organizerId: data.organizer_id,
          communityId: data.community_id,
          hasOrganizer: !!organizer,
          hasCommunity: !!community,
        });
        throw new Error('Failed to load event dependencies');
      }

      const event = toDomainEvent(data, { organizer, community });
      logger.debug('🎉 API: Successfully fetched event by ID', {
        id,
        title: event.title,
        startDateTime: event.startDateTime,
      });
      return event;
    } catch (transformError) {
      logger.error('🎉 API: Error transforming event', {
        id,
        error:
          transformError instanceof Error
            ? transformError.message
            : 'Unknown error',
      });
      throw new Error('Failed to process event data');
    }
  } catch (error) {
    logger.error('🎉 API: Error fetching event by ID', {
      id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}