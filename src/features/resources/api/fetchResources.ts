import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { ResourceFilter, ResourceSummary } from '@/features/resources';
import { toDomainResourceSummary } from '../transformers';
import { appendQueries } from '@/shared';
import {
  ResourceRowJoinCommunitiesJoinTimeslots,
  SELECT_RESOURCES_JOIN_COMMUNITIES_JOIN_TIMESLOTS,
} from '../types/resourceRow';

export async function fetchResources(
  supabase: SupabaseClient<Database>,
  filters?: ResourceFilter,
): Promise<ResourceSummary[]> {
  let query = supabase
    .from('resources')
    .select(SELECT_RESOURCES_JOIN_COMMUNITIES_JOIN_TIMESLOTS)
    .or('expires_at.is.null,expires_at.gt.now()');

  if (filters) {
    query = appendQueries(query, {
      status: filters.status,
      owner_id: filters.ownerId,
      'resource_communities.community_id': filters.communityId,
    });
  }

  // Execute the query
  const { data, error } = (await query.order('created_at', {
    ascending: false,
  })) as {
    data: ResourceRowJoinCommunitiesJoinTimeslots[] | null;
    error: Error | null;
  };

  if (error) {
    throw error;
  }

  if (!data) {
    return [];
  }

  return data.map((row) => toDomainResourceSummary(row));
}
