import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Resource, ResourceFilter } from '@/features/resources';
import { toDomainResource } from '../transformers/resourceTransformer';
import { SELECT_RESOURCE_WITH_RELATIONS } from '../types/resourceRow';
import { getAuthIdOrThrow } from '@/shared';

export async function fetchResources(
  supabase: SupabaseClient<Database>,
  filters?: ResourceFilter,
): Promise<Resource[]> {
  await getAuthIdOrThrow(supabase);

  // If filtering by communities, use junction table to get resources from multiple communities
  const needsCommunityFilter =
    filters?.communityId ||
    (filters?.communityIds && filters.communityIds.length > 0);

  if (needsCommunityFilter) {
    // Build community filter for junction table
    const communityIds =
      filters?.communityIds && filters.communityIds.length > 0
        ? filters.communityIds
        : filters?.communityId
          ? [filters.communityId]
          : [];

    if (communityIds.length === 0) {
      return [];
    }

    // Query through junction table to get resources visible in specified communities
    const { data: junctionData, error: junctionError } = await supabase
      .from('resource_communities')
      .select('resource_id')
      .in('community_id', communityIds);

    if (junctionError) {
      throw junctionError;
    }

    if (!junctionData || junctionData.length === 0) {
      return [];
    }

    const filteredResourceIds = [
      ...new Set(junctionData.map((rc) => rc.resource_id)),
    ];

    // Build the query to fetch resources with these IDs (not executed until the await below)
    let query = supabase
      .from('resources')
      .select(SELECT_RESOURCE_WITH_RELATIONS)
      .in('id', filteredResourceIds);

    // Apply other filters
    if (filters.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }

    if (filters.type && filters.type !== 'all') {
      query = query.eq('type', filters.type);
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

    // Handle the most common case: exclude expired resources (default behavior)
    if (filters.includeExpired === false) {
      query = query.or('expires_at.is.null,expires_at.gte.now()');
    }

    // Handle exclude past resources (like feed uses includePast: false)
    // FIXME past is not about expires_at, but about timeslots
    if (filters.includePast === false) {
      query = query.or('expires_at.is.null,expires_at.gte.now()');
    }

    // Execute the query
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
  } else {
    // No community filtering - query resources directly
    let query = supabase
      .from('resources')
      .select(SELECT_RESOURCE_WITH_RELATIONS);

    if (filters) {
      if (filters.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }

      if (filters.type && filters.type !== 'all') {
        query = query.eq('type', filters.type);
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
      // Handle the most common case: exclude expired resources (default behavior)
      if (filters.includeExpired === false) {
        query = query.or('expires_at.is.null,expires_at.gte.now()');
      }

      // Handle exclude past resources (like feed uses includePast: false)
      if (filters.includePast === false) {
        query = query.or('expires_at.is.null,expires_at.gte.now()');
      }
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
}
