import { logger } from '../../../shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../shared/types/database';
import type {
  ShoutoutResourceInput,
  ShoutoutGatheringInput,
  Shoutout,
} from '../types';
import {
  toShoutoutUpdateRow,
  toShoutoutWithJoinedRelations,
} from '../transformers/shoutoutsTransformer';
import { SELECT_SHOUTOUT_WITH_RELATIONS } from '../types/shoutoutRow';
import { getAuthIdOrThrow } from '../../../shared/utils';

/**
 * Updates an existing shoutout
 */
export async function updateShoutout(
  supabase: SupabaseClient<Database>,
  id: string,
  updateData: Partial<ShoutoutResourceInput | ShoutoutGatheringInput>,
): Promise<Shoutout | null> {
  logger.debug('📢 API: Updating shoutout', {
    id,
    message: updateData.message,
  });

  try {
    await getAuthIdOrThrow(supabase, 'update shoutout');
    const dbData = toShoutoutUpdateRow(updateData);

    const { data, error } = await supabase
      .from('shoutouts')
      .update(dbData)
      .eq('id', id)
      .select(SELECT_SHOUTOUT_WITH_RELATIONS)
      .single();

    if (error) {
      logger.error('📢 API: Failed to update shoutout', {
        error,
        id,
        updateData,
      });
      throw error;
    }

    if (!data) {
      logger.debug('📢 API: Shoutout not found for update', { id });
      return null;
    }

    // Transform to domain object using the transformer
    const shoutout = toShoutoutWithJoinedRelations(data);

    logger.debug('📢 API: Successfully updated shoutout', {
      id: shoutout.id,
      message: shoutout.message,
    });
    return shoutout;
  } catch (error) {
    logger.error('📢 API: Error updating shoutout', { error, id, updateData });
    throw error;
  }
}
