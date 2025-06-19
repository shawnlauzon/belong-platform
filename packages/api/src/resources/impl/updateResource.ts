import { getBelongClient } from '@belongnetwork/core';
import type { Resource, ResourceData } from '@belongnetwork/types';
import { toDomainResource, forDbUpdate } from './resourceTransformer';
import { fetchUserById } from '../../users/impl/fetchUserById';
import { fetchCommunityById } from '../../communities/impl/fetchCommunityById';
import {
  MESSAGE_AUTHENTICATION_REQUIRED,
  MESSAGE_NOT_AUTHORIZED,
} from '../../constants';

export async function updateResource(
  data: Partial<ResourceData> & { id: string }
): Promise<Resource> {
  const { supabase, logger } = getBelongClient();
  
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
      throw new Error('You are not authorized to update this resource');
    }

    // Transform to database format  
    const dbResource = forDbUpdate(data);

    // Update in database
    const { data: updatedResource, error: updateError } = await supabase
      .from('resources')
      .update(dbResource)
      .eq('id', data.id)
      .select('*')
      .single();

    if (updateError) {
      logger.error('📚 API: Failed to update resource', {
        id: data.id,
        error: updateError,
      });
      throw updateError;
    }

    // Fetch owner and community from cache
    const [owner, community] = await Promise.all([
      fetchUserById(updatedResource.owner_id),
      updatedResource.community_id ? fetchCommunityById(updatedResource.community_id) : Promise.resolve(null),
    ]);

    if (!owner) {
      throw new Error('Owner not found');
    }
    
    if (updatedResource.community_id && !community) {
      throw new Error('Community not found');
    }

    // Transform to domain model
    const resource = toDomainResource(updatedResource, { owner, community: community || undefined });

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
