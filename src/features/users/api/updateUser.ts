import { logger } from '@/shared';
import type { Database } from '@/shared/types/database';
import { SupabaseClient } from '@supabase/supabase-js';
import { toDomainUser, forDbUpdate } from '../transformers/userTransformer';
import { UserDetail } from '../types';
import { commitImageUrls } from '@/features/images/api/imageCommit';

export async function updateUser(
  supabase: SupabaseClient<Database>,
  userData: Partial<UserDetail> & { id: string },
): Promise<UserDetail> {
  logger.debug('👤 API: Updating user', { id: userData.id });

  try {
    // First, fetch the current profile to merge with partial updates
    const { data: currentProfile, error: fetchError } = await supabase
      .from('profiles')
      .select()
      .eq('id', userData.id)
      .single();

    if (fetchError) {
      logger.error('👤 API: Failed to fetch current profile', {
        id: userData.id,
        error: fetchError,
      });
      throw fetchError;
    }

    // Auto-commit avatar image if present and is temporary
    let finalAvatarUrl = userData.avatarUrl;
    if (userData.avatarUrl) {
      try {
        const permanentUrls = await commitImageUrls({
          supabase,
          imageUrls: [userData.avatarUrl],
          entityType: 'user',
          entityId: userData.id,
        });

        if (
          permanentUrls.length > 0 &&
          permanentUrls[0] !== userData.avatarUrl
        ) {
          finalAvatarUrl = permanentUrls[0];
        }
      } catch (error) {
        logger.error('👤 API: Failed to commit user avatar image', {
          userId: userData.id,
          error,
        });
        throw new Error(
          `Failed to commit user avatar image: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    const updateData = forDbUpdate(
      { ...userData, avatarUrl: finalAvatarUrl },
      currentProfile,
    );

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userData.id)
      .select()
      .single();

    if (error) {
      logger.error('👤 API: Failed to update user', {
        id: userData.id,
        error,
      });
      throw error;
    }

    const user = toDomainUser(data);

    logger.info('👤 API: Successfully updated user', {
      id: user.id,
      email: user.email,
    });

    return user;
  } catch (error) {
    logger.error('👤 API: Error updating user', {
      id: userData.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
