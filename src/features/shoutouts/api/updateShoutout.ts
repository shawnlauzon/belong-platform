import { logger } from '../../../shared';
import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../shared/types/database';
import type { ShoutoutInput, Shoutout } from '../types';
import {
  toShoutoutUpdateRow,
  toDomainShoutout,
} from '../transformers/shoutoutsTransformer';
import { SELECT_SHOUTOUT_BASIC, ShoutoutRow } from '../types/shoutoutRow';

/**
 * Updates an existing shoutout
 */
export async function updateShoutout(
  supabase: SupabaseClient<Database>,
  updateData: Partial<ShoutoutInput> & { id: string },
): Promise<Shoutout | null> {
  logger.debug('📢 API: Updating shoutout', {
    id: updateData.id,
    message: updateData.message,
  });

  try {
    const dbData = toShoutoutUpdateRow(updateData);

    const { data, error } = (await supabase
      .from('shoutouts')
      .update(dbData)
      .eq('id', updateData.id)
      .select(SELECT_SHOUTOUT_BASIC)
      .maybeSingle()) as { data: ShoutoutRow | null; error: QueryError | null };

    if (error) {
      logger.error('📢 API: Failed to update shoutout', {
        error,
        updateData,
      });
      throw error;
    }

    if (!data) {
      logger.debug('📢 API: Shoutout not found for update', {
        id: updateData.id,
      });
      return null;
    }

    // Transform to domain object using the transformer
    const shoutout = toDomainShoutout(data);

    logger.debug('📢 API: Successfully updated shoutout', {
      id: shoutout.id,
      message: shoutout.message,
    });
    return shoutout;
  } catch (error) {
    logger.error('📢 API: Error updating shoutout', { error, updateData });
    throw error;
  }
}
