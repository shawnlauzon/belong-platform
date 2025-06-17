import { getBelongClient } from '@belongnetwork/core';
import { toDomainResource } from './resourceTransformer';
import { fetchUserById } from '../../users/impl/fetchUserById';
import { fetchCommunityById } from '../../communities/impl/fetchCommunityById';
import type { Resource } from '@belongnetwork/types';
import { MESSAGE_AUTHENTICATION_REQUIRED } from '../../constants';

/**
 * Soft deletes a resource by ID if the current user is the owner
 * @param id The ID of the resource to delete
 * @returns The deleted resource if successful, null if not found
 * @throws {Error} If user is not authenticated, not authorized, or other error occurs
 */
export async function deleteResource(id: string): Promise<Resource | null> {
  const { supabase, logger } = getBelongClient();
  
  logger.debug('📚 API: Deleting resource', { id });

  try {
    // Get current user
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user?.id) {
      logger.error('📚 API: User must be authenticated to delete a resource', {
        error: userError,
      });
      throw new Error(MESSAGE_AUTHENTICATION_REQUIRED);
    }

    const userId = userData.user.id;

    // First, fetch the existing resource to verify ownership
    const { data: existingResource, error: fetchError } = await supabase
      .from('resources')
      .select('owner_id, community_id')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        // Resource not found - we can consider this a success
        logger.debug('📚 API: Resource not found for deletion', { id });
        return null;
      }

      logger.error('📚 API: Failed to fetch resource for deletion', {
        id,
        error: fetchError.message,
        code: fetchError.code,
      });
      throw fetchError;
    }

    // Check if the current user is the owner
    if (existingResource.owner_id !== userId) {
      logger.error('📚 API: User is not authorized to delete this resource', {
        userId,
        ownerId: existingResource.owner_id,
        resourceId: id,
      });
      throw new Error('You are not authorized to delete this resource');
    }

    // Perform the soft delete (set is_active to false)
    const { data: updatedResource, error: deleteError } = await supabase
      .from('resources')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (deleteError) {
      logger.error('📚 API: Failed to delete resource', {
        id,
        error: deleteError.message,
        code: deleteError.code,
      });
      throw deleteError;
    }

    if (!updatedResource) {
      logger.error('📚 API: No data returned after delete', { id });
      throw new Error('No data returned after delete operation');
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

    logger.info('📚 API: Successfully deleted resource', {
      id,
      title: resource.title,
      type: resource.type,
      category: resource.category,
    });

    return resource;
  } catch (error) {
    logger.error('📚 API: Error deleting resource', {
      id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
