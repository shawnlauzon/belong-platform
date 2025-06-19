import { getBelongClient } from '@belongnetwork/core';
import { MESSAGE_AUTHENTICATION_REQUIRED } from '../../constants';

/**
 * Soft deletes a resource by ID if the current user is the owner
 * @param id The ID of the resource to delete
 * @returns void if successful
 * @throws {Error} If user is not authenticated, not authorized, or other error occurs
 */
export async function deleteResource(id: string): Promise<void> {
  const { supabase, logger } = getBelongClient();
  
  logger.debug('📚 API: Deleting resource', { id });

  try {
    logger.debug('📚 API: Starting delete operation', { id });
    // Get current user
    logger.debug('📚 API: Getting current user', { id });
    const { data: userData, error: userError } = await supabase.auth.getUser();
    logger.debug('📚 API: Got user data', { id, hasUser: !!userData?.user?.id, userError: !!userError });

    if (userError || !userData?.user?.id) {
      logger.error('📚 API: User must be authenticated to delete a resource', {
        error: userError,
      });
      throw new Error(MESSAGE_AUTHENTICATION_REQUIRED);
    }

    const userId = userData.user.id;
    logger.debug('📚 API: Authenticated user', { id, userId });

    // First, fetch the existing resource to verify ownership
    logger.debug('📚 API: Fetching resource for ownership check', { id });
    const { data: existingResource, error: fetchError } = await supabase
      .from('resources')
      .select('owner_id, community_id')
      .eq('id', id)
      .single();
    
    logger.debug('📚 API: Fetch result', { id, hasResource: !!existingResource, fetchError: !!fetchError, errorCode: fetchError?.code });

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        // Resource not found - we can consider this a success
        logger.debug('📚 API: Resource not found for deletion', { id });
        return;
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
    logger.debug('📚 API: Performing soft delete update', { id });
    const { error: deleteError } = await supabase
      .from('resources')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    logger.debug('📚 API: Update result', { id, deleteError: !!deleteError });

    if (deleteError) {
      logger.error('📚 API: Failed to delete resource', {
        id,
        error: deleteError.message,
        code: deleteError.code,
      });
      throw deleteError;
    }

    logger.info('📚 API: Successfully deleted resource', { id });
    logger.debug('📚 API: About to return from deleteResource', { id });

    return;
  } catch (error) {
    logger.error('📚 API: Error deleting resource', {
      id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
