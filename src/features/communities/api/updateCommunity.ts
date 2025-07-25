import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type {
  CommunityInput,
  Community,
  CommunityRow,
} from '@/features/communities/types';
import {
  toCommunityUpdateRow,
  toDomainCommunity,
} from '@/features/communities/transformers/communityTransformer';
import { logger } from '@/shared';

export async function updateCommunity(
  supabase: SupabaseClient<Database>,
  updateData: Partial<CommunityInput> & { id: string },
): Promise<Community> {
  logger.debug('🏘️ API: Updating community', {
    id: updateData.id,
    name: updateData.name,
  });

  const dbData = toCommunityUpdateRow(updateData);

  const { data, error } = (await supabase
    .from('communities')
    .update(dbData)
    .eq('id', updateData.id)
    .select()
    .maybeSingle()) as {
    data: CommunityRow | null;
    error: QueryError | null;
  };

  if (error) {
    logger.error('🏘️ API: Failed to update community', { error, updateData });
    throw error;
  }

  if (!data) {
    logger.debug('🏘️ API: Community not found for update', {
      id: updateData.id,
    });
    throw new Error('Community not found for update');
  }

  const community = toDomainCommunity(data);

  logger.debug('🏘️ API: Successfully updated community', {
    id: community.id,
    name: community.name,
  });
  return community;
}
