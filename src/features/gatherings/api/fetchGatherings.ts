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

    // Note: Complex temporal filtering is done in JavaScript after fetching
    // because PostgREST's OR syntax doesn't support complex AND conditions
  }

  const { data, error } = await query.order('start_date_time', {
    ascending: true,
  });

  if (error) {
    throw error;
  }
  
  if (!data) {
    return [];
  }
  
  let gatherings = data.map((row) => toGatheringWithJoinedRelations(row));
  
  // Apply temporal filtering in JavaScript if needed
  const shouldFilterByTime = filters && (
    filters.includePast === false || 
    filters.includeCurrent === false || 
    filters.includeFuture === false
  );
  
  if (shouldFilterByTime) {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    
    gatherings = gatherings.filter(gathering => {
      const startDateTime = new Date(gathering.startDateTime);
      const endDateTime = gathering.endDateTime ? new Date(gathering.endDateTime) : null;
      
      // Determine if gathering is past, current, or future
      let isPast = false;
      let isCurrent = false;
      let isFuture = false;
      
      if (endDateTime) {
        // Event with end time - use end time to determine status
        if (endDateTime < now) {
          isPast = true;
        } else if (startDateTime <= now && endDateTime >= now) {
          isCurrent = true;
        } else {
          isFuture = true;
        }
      } else {
        // Event without end time - consider current for 2 hours after start
        if (startDateTime < twoHoursAgo) {
          isPast = true;
        } else if (startDateTime >= twoHoursAgo && startDateTime <= now) {
          isCurrent = true;
        } else {
          isFuture = true;
        }
      }
      
      // Include based on filter settings
      const shouldInclude = (
        (filters!.includePast !== false && isPast) ||
        (filters!.includeCurrent !== false && isCurrent) ||
        (filters!.includeFuture !== false && isFuture)
      );
      
      return shouldInclude;
    });
  }

  return gatherings;
}
