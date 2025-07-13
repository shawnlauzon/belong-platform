import { logger } from '../../../shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../shared/types/database';
import type { ShoutoutInput, Shoutout } from '../types';
import { toShoutoutInsertRow, toShoutoutWithJoinedRelations } from '../transformers/shoutoutsTransformer';
import { getAuthIdOrThrow } from '../../../shared/utils';
import { commitImageUrls } from '../../images/api/imageCommit';
import { updateShoutout } from './updateShoutout';
import { SELECT_SHOUTOUT_WITH_RELATIONS } from '../types/shoutoutRow';

/**
 * Creates a new shoutout with the current user as the sender
 */
export async function createShoutout(
  supabase: SupabaseClient<Database>,
  shoutoutData: ShoutoutInput,
): Promise<Shoutout> {
  logger.debug('📢 API: Creating shoutout', { shoutoutData });

  try {
    // Get current user
    const currentUserId = await getAuthIdOrThrow(supabase, 'create shoutout');

    // Validate business rules before database operation
    if (shoutoutData.toUserId === currentUserId) {
      throw new Error('Cannot send shoutout to yourself');
    }

    // Transform to database format with auto-assigned fromUserId
    const dbShoutout = toShoutoutInsertRow(shoutoutData, currentUserId);

    // Insert into database with joined relations
    const { data: createdShoutout, error } = await supabase
      .from('shoutouts')
      .insert([dbShoutout])
      .select(SELECT_SHOUTOUT_WITH_RELATIONS)
      .single();

    if (error) {
      logger.error('📢 API: Failed to create shoutout', { error });
      throw error;
    }

    // Transform to domain object using the transformer
    const domainShoutout = toShoutoutWithJoinedRelations(createdShoutout);

    // Auto-commit any temporary image URLs after shoutout creation
    if (shoutoutData.imageUrls && shoutoutData.imageUrls.length > 0) {
      try {
        const permanentUrls = await commitImageUrls({
          supabase,
          imageUrls: shoutoutData.imageUrls,
          entityType: 'shoutout',
          entityId: createdShoutout.id,
        });

        // Update shoutout with permanent URLs if they changed
        if (
          JSON.stringify(permanentUrls) !==
          JSON.stringify(shoutoutData.imageUrls)
        ) {
          const updatedShoutout = await updateShoutout(
            supabase,
            createdShoutout.id,
            {
              imageUrls: permanentUrls,
            },
          );
          if (updatedShoutout) {
            return updatedShoutout;
          }
        }
      } catch (error) {
        logger.error('📢 API: Failed to commit shoutout images', { error });
        throw new Error(
          `Failed to commit shoutout images: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    logger.info('📢 API: Successfully created shoutout', {
      id: domainShoutout.id,
      fromUserId: domainShoutout.fromUserId,
      toUserId: domainShoutout.toUserId,
      resourceId: 'resourceId' in domainShoutout ? domainShoutout.resourceId : undefined,
      gatheringId: 'gatheringId' in domainShoutout ? domainShoutout.gatheringId : undefined,
    });

    return domainShoutout;
  } catch (error) {
    logger.error('📢 API: Error creating shoutout', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
