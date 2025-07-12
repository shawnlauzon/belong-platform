import { logger } from '@/shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Shoutout } from '../types';
import { toShoutoutWithJoinedRelations } from '../transformers/shoutoutsTransformer';
import { SELECT_SHOUTOUT_WITH_RELATIONS } from '../types/shoutoutRow';

/**
 * Fetches a single shoutout by ID with all relations
 */
export async function fetchShoutoutById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<Shoutout | null> {
  logger.debug('📢 API: Fetching shoutout by ID', { id });

  const { data, error } = await supabase
    .from('shoutouts')
    .select(SELECT_SHOUTOUT_WITH_RELATIONS)
    .eq('id', id)
    .single();

  if (error || !data) {
    logger.debug('📢 API: Shoutout not found', { id, error });
    return null;
  }

  return toShoutoutWithJoinedRelations(data);
}