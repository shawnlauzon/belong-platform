import { logger } from '../../../shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../shared/types/database';
import type { ShoutoutData, ShoutoutInfo } from '../types';
import { forDbUpdate, toShoutoutInfo } from '../transformers/shoutoutsTransformer';
import { getAuthIdOrThrow } from '../../../shared/utils';

/**
 * Updates an existing shoutout
 */
export async function updateShoutout(
  supabase: SupabaseClient<Database>,
  id: string,
  updateData: Partial<ShoutoutData>,
): Promise<ShoutoutInfo | null> {
  logger.debug('📢 API: Updating shoutout', {
    id,
    message: updateData.message,
  });

  try {
    await getAuthIdOrThrow(supabase, 'update shoutout');
    const dbData = forDbUpdate(updateData);

    const { data, error } = await supabase
      .from('shoutouts')
      .update(dbData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('📢 API: Failed to update shoutout', { error, id, updateData });
      throw error;
    }

    if (!data) {
      logger.debug('📢 API: Shoutout not found for update', { id });
      return null;
    }

    const shoutoutInfo = toShoutoutInfo(
      data,
      data.from_user_id,
      data.to_user_id,
      data.resource_id,
    );

    logger.debug('📢 API: Successfully updated shoutout', {
      id: shoutoutInfo.id,
      message: shoutoutInfo.message,
    });
    return shoutoutInfo;
  } catch (error) {
    logger.error('📢 API: Error updating shoutout', { error, id, updateData });
    throw error;
  }
}