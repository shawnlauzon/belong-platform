import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type {
  CommunityInput,
  Community,
} from '@/features/communities/types';
import {
  toCommunityUpdateRow,
  toDomainCommunity,
} from '@/features/communities/transformers/communityTransformer';
import { logger } from '@/shared';
import { getAuthIdOrThrow } from '@/shared/utils/auth-helpers';

export async function updateCommunity(
  supabase: SupabaseClient<Database>,
  updateData: Partial<CommunityInput> & { id: string },
): Promise<Community | null> {
  logger.debug('🏘️ API: Updating community', {
    id: updateData.id,
    name: updateData.name,
  });

  try {
    await getAuthIdOrThrow(supabase);

    const dbData = toCommunityUpdateRow(updateData);

    const { data, error } = await supabase
      .from('communities')
      .update(dbData)
      .eq('id', updateData.id)
      .select()
      .single();

    if (error) {
      logger.error('🏘️ API: Failed to update community', { error, updateData });
      throw error;
    }

    if (!data) {
      logger.debug('🏘️ API: Community not found for update', {
        id: updateData.id,
      });
      return null;
    }

    const community = toDomainCommunity(data);

    logger.debug('🏘️ API: Successfully updated community', {
      id: community.id,
      name: community.name,
    });
    return community;
  } catch (error) {
    logger.error('🏘️ API: Error updating community', { error, updateData });
    throw error;
  }
}
