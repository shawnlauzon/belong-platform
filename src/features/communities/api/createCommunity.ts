import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { CommunityData, CommunityInfo } from '../types';
import {
  forDbInsert,
  toCommunityInfo,
} from '../transformers/communityTransformer';
import { logger } from '@/shared';
import { getAuthIdOrThrow } from '@/shared/utils/auth-helpers';

export async function createCommunity(
  supabase: SupabaseClient<Database>,
  communityData: CommunityData,
): Promise<CommunityInfo | null> {
  logger.debug('🏘️ API: Creating community', { name: communityData.name });

  try {
    const currentUserId = await getAuthIdOrThrow(supabase);

    const dbData = forDbInsert(communityData);

    const { data, error } = await supabase
      .from('communities')
      .insert(dbData)
      .select()
      .single();

    if (error) {
      logger.error('🏘️ API: Failed to create community', {
        error,
        communityData,
      });
      throw error;
    }

    if (!data) {
      logger.error('🏘️ API: No data returned after creating community');
      return null;
    }

    // Organizer membership is auto-created by database trigger

    const communityInfo = toCommunityInfo(data);

    logger.debug('🏘️ API: Successfully created community', {
      id: communityInfo.id,
      name: communityInfo.name,
    });
    return communityInfo;
  } catch (error) {
    logger.error('🏘️ API: Error creating community', { error, communityData });
    throw error;
  }
}
