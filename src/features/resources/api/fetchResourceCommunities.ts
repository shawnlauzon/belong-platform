import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { CommunitySummary } from '@/features/communities';
import { toDomainCommunitySummary } from '@/features/communities/transformers/communityTransformer';

/**
 * Fetch all communities associated with a resource through the junction table
 */
export async function fetchResourceCommunities(
  supabase: SupabaseClient<Database>,
  resourceId: string,
): Promise<CommunitySummary[]> {
  const { data, error } = await supabase
    .from('resource_communities')
    .select(`
      community_id,
      communities!inner(*)
    `)
    .eq('resource_id', resourceId);

  if (error) {
    throw error;
  }

  if (!data) {
    return [];
  }

  return data.map((item) => {
    const community = Array.isArray(item.communities) 
      ? item.communities[0] 
      : item.communities;
    
    if (!community) {
      throw new Error(`Community data missing for resource ${resourceId}`);
    }
    
    return toDomainCommunitySummary(community);
  });
}

/**
 * Fetch communities for multiple resources efficiently
 */
export async function fetchResourceCommunitiesBatch(
  supabase: SupabaseClient<Database>,
  resourceIds: string[],
): Promise<Record<string, CommunitySummary[]>> {
  if (resourceIds.length === 0) {
    return {};
  }

  const { data, error } = await supabase
    .from('resource_communities')
    .select(`
      resource_id,
      community_id,
      communities!inner(*)
    `)
    .in('resource_id', resourceIds);

  if (error) {
    throw error;
  }

  if (!data) {
    return {};
  }

  const result: Record<string, CommunitySummary[]> = {};
  
  for (const item of data) {
    const community = Array.isArray(item.communities) 
      ? item.communities[0] 
      : item.communities;
    
    if (!community) {
      continue;
    }
    
    const communitySummary = toDomainCommunitySummary(community);
    
    if (!result[item.resource_id]) {
      result[item.resource_id] = [];
    }
    
    result[item.resource_id].push(communitySummary);
  }

  return result;
}