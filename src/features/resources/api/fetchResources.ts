import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { ResourceInfo, ResourceFilter } from '@/features/resources';
import { toResourceInfo } from '@/features/resources/transformers/resourceTransformer';

export async function fetchResources(
  supabase: SupabaseClient<Database>,
  filters?: ResourceFilter,
): Promise<ResourceInfo[]> {
  let query = supabase.from('resources').select('*');

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

    if (filters.ownerId) {
      query = query.eq('owner_id', filters.ownerId);
    }

    if (filters.searchTerm) {
      query = query.or(
        `title.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%`,
      );
    }
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((row) => toResourceInfo(row, row.owner_id, row.community_id));
}
