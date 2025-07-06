import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { EventInfo, EventFilter } from '@/features/events';
import { toEventInfo } from '@/features/events/transformers/eventTransformer';
import { EventRow } from '../types/database';

export async function fetchEvents(
  supabase: SupabaseClient<Database>,
  filters?: EventFilter,
): Promise<EventInfo[]> {
  let query = supabase.from('events').select('*');

  if (filters) {
    if (filters.communityId) {
      query = query.eq('community_id', filters.communityId);
    }

    if (filters.organizerId) {
      query = query.eq('organizer_id', filters.organizerId);
    }

    if (filters.startAfter) {
      query = query.gte('start_date_time', filters.startAfter.toISOString());
    }

    if (filters.startBefore) {
      query = query.lte('start_date_time', filters.startBefore.toISOString());
    }

    if (filters.isRegistrationRequired !== undefined) {
      query = query.eq('registration_required', filters.isRegistrationRequired);
    }

    if (filters.hasAvailableSpots) {
      query = query.filter('max_attendees', 'gt', 'attendee_count');
    }

    if (filters.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }

    if (filters.searchTerm) {
      query = query.or(
        `title.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%`,
      );
    }
  }

  const { data, error } = (await query.order('start_date_time', {
    ascending: true,
  })) as {
    data: EventRow[];
    error: QueryError | null;
  };

  if (error || !data) {
    return [];
  }

  return data.map((row) => toEventInfo(row));
}