import { logger } from '../../../shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../shared/types/database';
import type { ShoutoutInput, Shoutout } from '../types';
import { toShoutoutInsertRow } from '../transformers/shoutoutsTransformer';
import { getAuthIdOrThrow } from '../../../shared/utils';
import { commitImageUrls } from '../../images/api/imageCommit';
import { updateShoutout } from './updateShoutout';

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

    // Insert into database
    const { data: createdShoutout, error } = await supabase
      .from('shoutouts')
      .insert([dbShoutout])
      .select('*')
      .single();

    if (error) {
      logger.error('📢 API: Failed to create shoutout', { error });
      throw error;
    }

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

    // Convert to Shoutout
    const shoutout = createdShoutout;

    logger.info('📢 API: Successfully created shoutout', {
      id: shoutout.id,
      fromUserId: shoutout.from_user_id,
      toUserId: shoutout.to_user_id,
      resourceId: shoutout.resource_id,
    });

    return {
      ...shoutout,
      fromUserId: shoutout.from_user_id,
      toUserId: shoutout.to_user_id,
      resourceId: shoutout.resource_id,
      communityId: shoutout.community_id,
      imageUrls: shoutout.image_urls || [],
      createdAt: new Date(shoutout.created_at),
      updatedAt: new Date(shoutout.updated_at),
      // Add required relation fields as placeholders
      fromUser: {
        id: shoutout.from_user_id,
        firstName: '',
        avatarUrl: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      toUser: {
        id: shoutout.to_user_id,
        firstName: '',
        avatarUrl: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      resource: {
        id: shoutout.resource_id,
        title: '',
        type: 'offer' as const,
        ownerId: '',
        owner: {
          id: '',
          firstName: '',
          avatarUrl: undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        imageUrls: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      community: {
        id: shoutout.community_id,
        name: '',
        type: 'place' as const,
        icon: undefined,
        memberCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
  } catch (error) {
    logger.error('📢 API: Error creating shoutout', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
