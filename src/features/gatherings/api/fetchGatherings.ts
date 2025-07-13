import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Gathering, GatheringFilter } from '@/features/gatherings';
import { toGatheringWithJoinedRelations } from '../transformers/gatheringTransformer';
import { SELECT_GATHERING_WITH_RELATIONS } from '../types/gatheringRow';

export async function fetchGatherings(
  supabase: SupabaseClient<Database>,
  filters?: GatheringFilter,
): Promise<Gathering[]> {
  let query = supabase
    .from('gatherings')
    .select(SELECT_GATHERING_WITH_RELATIONS);

  if (filters) {
    if (filters.communityId) {
      query = query.eq('community_id', filters.communityId);
    }

    if (filters.communityIds && filters.communityIds.length > 0) {
      query = query.in('community_id', filters.communityIds);
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

    if (filters.searchTerm) {
      query = query.or(
        `title.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%`,
      );
    }

    // Handle time-based filtering (past, current, future)
    const shouldFilterByTime = 
      filters.includePast === false || 
      filters.includeCurrent === false || 
      filters.includeFuture === false;

    if (shouldFilterByTime) {
      const now = new Date().toISOString();
      const currentDate = new Date().toISOString().split('T')[0];
      const conditions: string[] = [];

      // Build conditions for each category that should be included
      if (filters.includePast !== false) {
        // Past gatherings: have completely ended
        conditions.push(
          // All-day without end: ended yesterday or earlier
          `and(is_all_day.eq.true,end_date_time.is.null,start_date_time::date.lt.${currentDate})`,
          // All-day with end: end date is before today
          `and(is_all_day.eq.true,end_date_time.is.not.null,end_date_time::date.lt.${currentDate})`,
          // Timed with end: end time is before now
          `and(is_all_day.eq.false,end_date_time.is.not.null,end_date_time.lt.${now})`,
          // Timed without end: started more than 1 hour ago
          `and(is_all_day.eq.false,end_date_time.is.null,start_date_time.lt.${new Date(Date.now() - 60*60*1000).toISOString()})`
        );
      }

      if (filters.includeCurrent !== false) {
        // Current gatherings: happening now
        conditions.push(
          // All-day without end: started today at or before current time and it's still today
          `and(is_all_day.eq.true,end_date_time.is.null,start_date_time.lte.${now},start_date_time::date.eq.${currentDate})`,
          // All-day with end: started at or before now and end date is today or later
          `and(is_all_day.eq.true,end_date_time.is.not.null,start_date_time.lte.${now},end_date_time::date.gte.${currentDate})`,
          // Timed with end: started at or before now and ends at or after now
          `and(is_all_day.eq.false,end_date_time.is.not.null,start_date_time.lte.${now},end_date_time.gte.${now})`,
          // Timed without end: started at or before now and within 1 hour
          `and(is_all_day.eq.false,end_date_time.is.null,start_date_time.lte.${now},start_date_time.gte.${new Date(Date.now() - 60*60*1000).toISOString()})`
        );
      }

      if (filters.includeFuture !== false) {
        // Future gatherings: haven't started yet
        conditions.push(
          // All-day: starts after current time
          `and(is_all_day.eq.true,start_date_time.gt.${now})`,
          // Timed: starts after current time
          `and(is_all_day.eq.false,start_date_time.gt.${now})`
        );
      }

      if (conditions.length > 0) {
        query = query.or(conditions.join(','));
      }
    }
  }

  const { data, error } = await query.order('start_date_time', {
    ascending: true,
  });

  if (error || !data) {
    return [];
  }

  return data.map((row) => toGatheringWithJoinedRelations(row));
}
