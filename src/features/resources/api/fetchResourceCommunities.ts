import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

/**
 * Fetch all community IDs associated with a resource through the junction table
 */
export async function fetchResourceCommunities(
  supabase: SupabaseClient<Database>,
  resourceId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('resource_communities')
    .select('community_id')
    .eq('resource_id', resourceId);

  if (error) {
    throw error;
  }

  if (!data) {
    return [];
  }

  return data.map((item) => item.community_id);
}

/**
 * Fetch community IDs for multiple resources efficiently
 */
export async function fetchResourceCommunitiesBatch(
  supabase: SupabaseClient<Database>,
  resourceIds: string[],
): Promise<Record<string, string[]>> {
  if (resourceIds.length === 0) {
    return {};
  }

  const { data, error } = await supabase
    .from('resource_communities')
    .select('resource_id, community_id')
    .in('resource_id', resourceIds);

  if (error) {
    throw error;
  }

  if (!data) {
    return {};
  }

  const result: Record<string, string[]> = {};
  
  for (const item of data) {
    if (!result[item.resource_id]) {
      result[item.resource_id] = [];
    }
    
    result[item.resource_id].push(item.community_id);
  }

  return result;
}