import { getBelongClient } from '@belongnetwork/core';
import type { Thanks, ThanksData } from '@belongnetwork/types';
import { toDomainThanks, forDbUpdate } from './thanksTransformer';
import { fetchUserById } from '../../users/impl/fetchUserById';
import { fetchResourceById } from '../../resources/impl/fetchResources';
import {
  MESSAGE_AUTHENTICATION_REQUIRED,
} from '../../constants';

export async function updateThanks(
  data: Partial<ThanksData> & { id: string }
): Promise<Thanks> {
  const { supabase, logger } = getBelongClient();
  logger.debug('🙏 API: Updating thanks', {
    id: data.id,
    updates: {
      ...data,
      message: data.message ? 'REDACTED' : undefined,
    },
  });

  try {
    // Get current user
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user?.id) {
      logger.error('🙏 API: User must be authenticated to update thanks', {
        error: userError,
      });
      throw new Error(MESSAGE_AUTHENTICATION_REQUIRED);
    }

    const userId = userData.user.id;

    // First, fetch the existing thanks to verify ownership
    const { data: existingThanks, error: fetchError } = await supabase
      .from('thanks')
      .select('from_user_id')
      .eq('id', data.id)
      .single();

    if (fetchError) {
      logger.error('🙏 API: Failed to fetch thanks for update', {
        id: data.id,
        error: fetchError,
      });
      throw fetchError;
    }

    // Check if the current user is the creator
    if (existingThanks.from_user_id !== userId) {
      logger.error('🙏 API: User is not authorized to update this thanks', {
        userId,
        fromUserId: existingThanks.from_user_id,
      });
      throw new Error('You are not authorized to update this thanks');
    }

    // Validate that user is not trying to change the sender
    if (data.fromUserId && data.fromUserId !== userId) {
      logger.error('🙏 API: Cannot change the sender of thanks', {
        userId,
        attemptedFromUserId: data.fromUserId,
      });
      throw new Error('Cannot change the sender of thanks');
    }

    // Validate that user is not trying to change receiver to themselves
    if (data.toUserId && data.toUserId === userId) {
      logger.error('🙏 API: Cannot change receiver to yourself', {
        userId,
        attemptedToUserId: data.toUserId,
      });
      throw new Error('Cannot change receiver to yourself');
    }

    // Transform to database format
    const dbThanks = forDbUpdate(data);

    // Update in database
    const { data: updatedThanks, error: updateError } = await supabase
      .from('thanks')
      .update(dbThanks)
      .eq('id', data.id)
      .select('*')
      .single();

    if (updateError) {
      logger.error('🙏 API: Failed to update thanks', {
        id: data.id,
        error: updateError,
      });
      throw updateError;
    }

    // Fetch users and resource from cache
    const [fromUser, toUser, resource] = await Promise.all([
      fetchUserById(updatedThanks.from_user_id),
      fetchUserById(updatedThanks.to_user_id),
      fetchResourceById(updatedThanks.resource_id),
    ]);

    if (!fromUser) {
      throw new Error('From user not found');
    }
    if (!toUser) {
      throw new Error('To user not found');
    }
    if (!resource) {
      throw new Error('Resource not found');
    }

    // Transform to domain model
    const thanks = toDomainThanks(updatedThanks, { fromUser, toUser, resource });

    logger.info('🙏 API: Successfully updated thanks', {
      id: thanks.id,
      fromUserId: thanks.fromUser.id,
      toUserId: thanks.toUser.id,
    });

    return thanks;
  } catch (error) {
    logger.error('🙏 API: Error updating thanks', {
      id: data.id,
      error,
    });
    throw error;
  }
}