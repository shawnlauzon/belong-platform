import { supabase } from '@belongnetwork/core';
import { logger } from '@belongnetwork/core';
import type { ThanksData, Thanks } from '@belongnetwork/types';
import { toDomainThanks, forDbInsert } from './thanksTransformer';
import { fetchUserById } from '../../users/impl/fetchUserById';
import { fetchResourceById } from '../../resources/impl/fetchResources';
import { MESSAGE_AUTHENTICATION_REQUIRED } from '../../constants';

export async function createThanks(data: ThanksData): Promise<Thanks> {
  logger.debug('🙏 API: Creating thanks', {
    data: { ...data, message: 'REDACTED' },
  });

  try {
    // Get current user
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user?.id) {
      logger.error('🙏 API: User must be authenticated to create thanks', {
        error: userError,
      });
      throw new Error(MESSAGE_AUTHENTICATION_REQUIRED);
    }

    const userId = userData.user.id;

    // Transform to database format
    const dbThanks = forDbInsert(data, userId);

    // Insert into database
    const { data: createdThanks, error } = await supabase
      .from('thanks')
      .insert([dbThanks])
      .select('*')
      .single();

    if (error) {
      logger.error('🙏 API: Failed to create thanks', { error });
      throw error;
    }

    // Fetch users and resource from cache
    const [fromUser, toUser, resource] = await Promise.all([
      fetchUserById(createdThanks.from_user_id),
      fetchUserById(createdThanks.to_user_id),
      fetchResourceById(createdThanks.resource_id),
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
    const thanks = toDomainThanks(createdThanks, { fromUser, toUser, resource });

    logger.info('🙏 API: Successfully created thanks', {
      id: thanks.id,
      fromUserId: thanks.fromUser.id,
      toUserId: thanks.toUser.id,
      resourceId: thanks.resource.id,
    });

    return thanks;
  } catch (error) {
    logger.error('🙏 API: Error creating thanks', { error });
    throw error;
  }
}