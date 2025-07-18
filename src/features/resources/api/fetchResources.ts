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

  // If filtering by claimUserId, we need to join with resource_claims table
  if (filters?.claimUserId) {
    return await fetchResourcesWithClaims(supabase, filters);
  }

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

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.searchTerm) {
      query = query.or(
        `title.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%`,
      );
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

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.searchTerm) {
        query = query.or(
          `title.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%`,
        );
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

async function fetchResourcesWithClaims(
  supabase: SupabaseClient<Database>,
  filters: ResourceFilter,
): Promise<Resource[]> {
  // First, get resource IDs that have claims from the specified user
  const { data: claimData, error: claimError } = await supabase
    .from('resource_claims')
    .select('resource_id')
    .eq('user_id', filters.claimUserId!);

  if (claimError) {
    throw claimError;
  }

  if (!claimData || claimData.length === 0) {
    return [];
  }

  // Get unique resource IDs
  const resourceIds = [...new Set(claimData.map((claim) => claim.resource_id))];

  // Now fetch the resources with these IDs
  let query = supabase
    .from('resources')
    .select(SELECT_RESOURCE_WITH_RELATIONS)
    .in('id', resourceIds);

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

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.searchTerm) {
    query = query.or(
      `title.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%`,
    );
  }

  // Apply community filtering if specified
  if (
    filters.communityId ||
    (filters.communityIds && filters.communityIds.length > 0)
  ) {
    const communityIds =
      filters.communityIds && filters.communityIds.length > 0
        ? filters.communityIds
        : filters.communityId
          ? [filters.communityId]
          : [];

    if (communityIds.length > 0) {
      // Get resources that are visible in specified communities
      const { data: junctionData, error: junctionError } = await supabase
        .from('resource_communities')
        .select('resource_id')
        .in('community_id', communityIds)
        .in('resource_id', resourceIds);

      if (junctionError) {
        throw junctionError;
      }

      if (!junctionData || junctionData.length === 0) {
        return [];
      }

      const filteredResourceIds = [
        ...new Set(junctionData.map((rc) => rc.resource_id)),
      ];
      query = query.in('id', filteredResourceIds);
    }
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  if (!data) {
    return [];
  }

  return data.map((row) => toDomainResource(row));
}
