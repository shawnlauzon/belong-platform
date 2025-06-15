import { supabase } from '@belongnetwork/core';
import { logger } from '@belongnetwork/core';
import type { Resource, ResourceData } from '@belongnetwork/types';
import { toDomainResource, forDbUpdate } from './resourceTransformer';
import {
  MESSAGE_AUTHENTICATION_REQUIRED,
  MESSAGE_NOT_AUTHORIZED,
} from '../../constants';

export async function updateResource(
  data: Partial<ResourceData> & { id: string }
): Promise<Resource> {
  logger.debug('📚 API: Updating resource', {
    id: data.id,
    updates: {
      ...data,
      location: data.location ? 'REDACTED' : undefined,
    },
  });

  try {
    // Get current user
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user?.id) {
      logger.error('📚 API: User must be authenticated to update a resource', {
        error: userError,
      });
      throw new Error(MESSAGE_AUTHENTICATION_REQUIRED);
    }

    const userId = userData.user.id;

    // First, fetch the existing resource to verify ownership
    const { data: existingResource, error: fetchError } = await supabase
      .from('resources')
      .select('owner_id')
      .eq('id', data.id)
      .single();

    if (fetchError) {
      logger.error('📚 API: Failed to fetch resource for update', {
        id: data.id,
        error: fetchError,
      });
      throw fetchError;
    }

    // Check if the current user is the owner
    if (existingResource.owner_id !== userId) {
      logger.error('📚 API: User is not authorized to update this resource', {
        userId,
        ownerId: existingResource.owner_id,
      });
      throw new Error(MESSAGE_NOT_AUTHORIZED);
    }

    // Transform to database format
    const dbResource = forDbUpdate(data, userId);

    // Update in database
    const { data: updatedResource, error: updateError } = await supabase
      .from('resources')
      .update(dbResource)
      .eq('id', data.id)
      .select('*, owner:profiles(*), community:communities(*)')
      .single();

    if (updateError) {
      logger.error('📚 API: Failed to update resource', {
        id: data.id,
        error: updateError,
      });
      throw updateError;
    }

    // Transform to domain model
    const resource = toDomainResource(updatedResource);

    logger.info('📚 API: Successfully updated resource', {
      id: resource.id,
      title: resource.title,
    });

    return resource;
  } catch (error) {
    logger.error('📚 API: Error updating resource', {
      id: data.id,
      error,
    });
    throw error;
  }
}
