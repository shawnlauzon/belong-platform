import { logger } from '../../../shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../shared/types/database';
import type { ShoutoutInput, Shoutout } from '../types';
import {
  toShoutoutUpdateRow,
} from '../transformers/shoutoutsTransformer';
import { getAuthIdOrThrow } from '../../../shared/utils';

/**
 * Updates an existing shoutout
 */
export async function updateShoutout(
  supabase: SupabaseClient<Database>,
  id: string,
  updateData: Partial<ShoutoutInput>,
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
      .select()
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

    const shoutout = {
      ...data,
      fromUserId: data.from_user_id,
      toUserId: data.to_user_id,
      resourceId: data.resource_id,
      communityId: data.community_id,
      imageUrls: data.image_urls || [],
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      // Add required relation fields as placeholders
      fromUser: { id: data.from_user_id, firstName: '', avatarUrl: undefined, createdAt: new Date(), updatedAt: new Date() },
      toUser: { id: data.to_user_id, firstName: '', avatarUrl: undefined, createdAt: new Date(), updatedAt: new Date() },
      resource: { id: data.resource_id, title: '', type: 'offer' as const, ownerId: '', owner: { id: '', firstName: '', avatarUrl: undefined, createdAt: new Date(), updatedAt: new Date() }, imageUrls: [], createdAt: new Date(), updatedAt: new Date() },
      community: { id: data.community_id, name: '', type: 'place' as const, icon: undefined, memberCount: 0, createdAt: new Date(), updatedAt: new Date() },
    };

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
