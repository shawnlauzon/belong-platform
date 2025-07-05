import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type {
  CommunityData,
  CommunityInfo,
} from '@/features/communities/types';
import {
  forDbUpdate,
  toCommunityInfo,
} from '@/features/communities/transformers/communityTransformer';
import { logger } from '@/shared';
import { getAuthIdOrThrow } from '@/shared/utils/auth-helpers';

export async function updateCommunity(
  supabase: SupabaseClient<Database>,
  updateData: Partial<CommunityData> & { id: string },
): Promise<CommunityInfo | null> {
  logger.debug('🏘️ API: Updating community', {
    id: updateData.id,
    name: updateData.name,
  });

  try {
    await getAuthIdOrThrow(supabase);

    const dbData = forDbUpdate(updateData);

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

    const communityInfo = toCommunityInfo(data);

    logger.debug('🏘️ API: Successfully updated community', {
      id: communityInfo.id,
      name: communityInfo.name,
    });
    return communityInfo;
  } catch (error) {
    logger.error('🏘️ API: Error updating community', { error, updateData });
    throw error;
  }
}
