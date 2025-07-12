import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { CommunityInput, Community } from '../types';
import {
  toCommunityInsertRow,
  toDomainCommunity,
} from '../transformers/communityTransformer';
import { logger } from '@/shared';
import { getAuthIdOrThrow } from '@/shared/utils/auth-helpers';
import { commitImageUrls } from '@/features/images/api/imageCommit';
import { updateCommunity } from './updateCommunity';

export async function createCommunity(
  supabase: SupabaseClient<Database>,
  communityData: CommunityInput,
): Promise<Community> {
  logger.debug('🏘️ API: Creating community', { name: communityData.name });

  try {
    const currentUserId = await getAuthIdOrThrow(supabase);

    const dbData = toCommunityInsertRow({
      ...communityData,
      organizerId: currentUserId,
    });

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
      throw new Error('No data returned after creating community');
    }

    // Organizer membership is auto-created by database trigger

    // Auto-commit banner image if present and is temporary
    if (communityData.bannerImageUrl) {
      try {
        const permanentUrls = await commitImageUrls({
          supabase,
          imageUrls: [communityData.bannerImageUrl],
          entityType: 'community',
          entityId: data.id,
        });

        // Update the community with permanent banner URL if it changed
        if (
          permanentUrls.length > 0 &&
          permanentUrls[0] !== communityData.bannerImageUrl
        ) {
          const updatedCommunity = await updateCommunity(supabase, {
            id: data.id,
            bannerImageUrl: permanentUrls[0],
          });

          if (updatedCommunity) {
            logger.debug(
              '🏘️ API: Successfully created community with committed banner',
              {
                id: updatedCommunity.id,
                name: updatedCommunity.name,
              },
            );
            return updatedCommunity;
          }
        }
      } catch (error) {
        logger.error('🏘️ API: Failed to commit community banner image', {
          communityId: data.id,
          error,
        });
        throw new Error(
          `Failed to commit community banner image: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    const community = toDomainCommunity(data);

    logger.debug('🏘️ API: Successfully created community', {
      id: community.id,
      name: community.name,
    });
    return community;
  } catch (error) {
    logger.error('🏘️ API: Error creating community', { error, communityData });
    throw error;
  }
}
