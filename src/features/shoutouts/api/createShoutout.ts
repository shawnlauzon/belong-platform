import { logger } from '../../../shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../shared/types/database';
import {
  type Shoutout,
  ShoutoutResourceInput,
} from '../types';
import {
  toResourceShoutoutInsertRow,
  toGeneralShoutoutInsertRow,
  toShoutoutWithJoinedRelations,
} from '../transformers/shoutoutsTransformer';
import { getAuthIdOrThrow } from '../../../shared/utils';
import { commitImageUrls } from '../../images/api/imageCommit';
import { updateShoutout } from './updateShoutout';
import {
  SELECT_SHOUTOUT_WITH_RELATIONS,
  ShoutoutInsertRow,
} from '../types/shoutoutRow';

/**
 * Creates a new shoutout with the current user as the sender
 */
export async function createResourceShoutout(
  supabase: SupabaseClient<Database>,
  shoutoutData: ShoutoutResourceInput & {
    toUserId: string;
    communityId: string;
  },
): Promise<Shoutout> {
  logger.debug('📢 API: Creating shoutout', { shoutoutData });

  // Get current user
  const currentUserId = await getAuthIdOrThrow(supabase, 'create shoutout');

  validBusinessRulesOrThrow({
    toUserId: shoutoutData.toUserId,
    currentUserId,
  });

  // Transform to database format with auto-assigned fromUserId
  const dbShoutout = toResourceShoutoutInsertRow({
    ...shoutoutData,
    fromUserId: currentUserId,
  });

  return insertShoutout(supabase, dbShoutout);
}

/**
 * Creates a new general shoutout with the current user as the sender
 */
export async function createGeneralShoutout(
  supabase: SupabaseClient<Database>,
  shoutoutData: {
    message: string;
    imageUrls?: string[];
    toUserId: string;
    communityId: string;
    resourceId?: string;
  },
): Promise<Shoutout> {
  logger.debug('📢 API: Creating general shoutout', { shoutoutData });

  // Get current user
  const currentUserId = await getAuthIdOrThrow(supabase, 'create shoutout');

  validBusinessRulesOrThrow({
    toUserId: shoutoutData.toUserId,
    currentUserId,
  });

  // Transform to database format with auto-assigned fromUserId
  const dbShoutout = toGeneralShoutoutInsertRow({
    ...shoutoutData,
    fromUserId: currentUserId,
  });

  return insertShoutout(supabase, dbShoutout);
}

function validBusinessRulesOrThrow({
  toUserId,
  currentUserId,
}: {
  toUserId: string;
  currentUserId: string;
}) {
  // Validate business rules before database operation
  if (toUserId === currentUserId) {
    throw new Error('Cannot send shoutout to yourself');
  }
}

/**
 * Creates a new shoutout with the current user as the sender
 */
async function insertShoutout(
  supabase: SupabaseClient<Database>,
  dbShoutout: ShoutoutInsertRow,
): Promise<Shoutout> {
  try {
    // Insert into database with joined relations
    const { data: createdShoutout, error } = await supabase
      .from('shoutouts')
      .insert(dbShoutout)
      .select(SELECT_SHOUTOUT_WITH_RELATIONS)
      .single();

    if (error) {
      logger.error('📢 API: Failed to create shoutout', { error });
      throw error;
    }

    // Transform to domain object using the transformer
    const domainShoutout = toShoutoutWithJoinedRelations(createdShoutout);

    // Auto-commit any temporary image URLs after shoutout creation
    if (domainShoutout.imageUrls && domainShoutout.imageUrls.length > 0) {
      try {
        const permanentUrls = await commitImageUrls({
          supabase,
          imageUrls: domainShoutout.imageUrls,
          entityType: 'shoutout',
          entityId: createdShoutout.id,
        });

        // Update shoutout with permanent URLs if they changed
        if (
          JSON.stringify(permanentUrls) !==
          JSON.stringify(domainShoutout.imageUrls)
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
      resourceId: domainShoutout.resourceId,
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
