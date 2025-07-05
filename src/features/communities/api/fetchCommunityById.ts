import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { CommunityInfo } from '../types';
import { toCommunityInfo } from '../transformers/communityTransformer';
import { logger } from '@/shared';

export async function fetchCommunityById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<CommunityInfo | null> {
  logger.debug('🏘️ API: Fetching community by ID', { id });

  try {
    const { data, error } = await supabase
      .from('communities')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        logger.debug('🏘️ API: Community not found', { id });
        return null;
      }
      logger.error('🏘️ API: Failed to fetch community', { error, id });
      throw error;
    }

    if (!data) {
      logger.debug('🏘️ API: Community not found', { id });
      return null;
    }

    const communityInfo = toCommunityInfo(data);

    logger.debug('🏘️ API: Successfully fetched community', {
      id,
      name: communityInfo.name,
    });
    return communityInfo;
  } catch (error) {
    logger.error('🏘️ API: Error fetching community by ID', { error, id });
    throw error;
  }
}
