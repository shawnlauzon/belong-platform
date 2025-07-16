import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Resource, ResourceFilter } from '@/features/resources';
import { toDomainResource } from '../transformers/resourceTransformer';
import { SELECT_RESOURCE_WITH_RELATIONS } from '../types/resourceRow';

export async function fetchResources(
  supabase: SupabaseClient<Database>,
  filters?: ResourceFilter,
): Promise<Resource[]> {
  let query = supabase.from('resources').select(SELECT_RESOURCE_WITH_RELATIONS);

  if (filters) {
    if (filters.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }

    if (filters.type && filters.type !== 'all') {
      query = query.eq('type', filters.type);
    }

    if (filters.communityId) {
      query = query.eq('community_id', filters.communityId);
    }

    if (filters.communityIds && filters.communityIds.length > 0) {
      query = query.in('community_id', filters.communityIds);
    }

    if (filters.ownerId) {
      query = query.eq('owner_id', filters.ownerId);
    }

    if (filters.searchTerm) {
      query = query.or(
        `title.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%`,
      );
    }

    // Apply time-based filtering at database level
    // For resources without timeslots, classification is based on expires_at:
    // - current/upcoming: expires_at IS NULL OR expires_at >= now()  
    // - past/expired: expires_at < now()
    
    // Handle the most common case: exclude expired resources (default behavior)
    if (filters.includeExpired === false) {
      query = query.or('expires_at.is.null,expires_at.gte.now()');
    }
    
    // Handle exclude past resources (like feed uses includePast: false)
    if (filters.includePast === false) {
      query = query.or('expires_at.is.null,expires_at.gte.now()');
    }
    
    // TODO: Add more sophisticated timeslot-based filtering when resource_timeslots
    // are included in the SELECT query and we can filter by actual timeslot times
  }

  const { data, error } = await query.order('created_at', {
    ascending: false,
  });

  if (error) {
    throw error;
  }
  
  if (!data) {
    return [];
  }

  return data.map((row) => toDomainResource(row));
}
