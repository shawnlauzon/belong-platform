import { supabase } from '@belongnetwork/core/config/supabase';
import { eventBus } from '@belongnetwork/core/eventBus/eventBus';
import { logger, logApiCall, logApiResponse } from '@belongnetwork/core/utils/logger';
import type { AppEvent } from '@belongnetwork/core/types/events';

export class ResourceDeleter {
  private static initialized = false;

  static initialize(): void {
    if (this.initialized) {
      logger.debug('🗑️ ResourceDeleter: Already initialized, skipping...');
      return;
    }

    logger.info('🚀 ResourceDeleter: Initializing...');

    eventBus.on('resource.delete.requested', (event: AppEvent) => {
      if (event.type !== 'resource.delete.requested') {
        logger.error('🗑️ ResourceDeleter: Received invalid event type', { event });
        return;
      }

      logger.debug('🗑️ ResourceDeleter: Delete requested', { resourceId: event.data.resourceId });
      this._deleteResource(event.data.resourceId);
    });

    this.initialized = true;
    logger.info('✅ ResourceDeleter: Initialized successfully');
  }

  private static async _deleteResource(resourceId: string): Promise<void> {
    logger.debug('🗑️ ResourceDeleter: Starting resource deletion', { resourceId });

    try {
      logApiCall('DELETE', `supabase/resources/${resourceId}`);

      // First, verify the resource exists and get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User must be authenticated to delete resources');
      }

      // Check if the resource exists and belongs to the current user
      const { data: existingResource, error: fetchError } = await supabase
        .from('resources')
        .select('id, creator_id, title')
        .eq('id', resourceId)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          throw new Error('Resource not found');
        }
        throw new Error(`Failed to verify resource: ${fetchError.message}`);
      }

      if (!existingResource) {
        throw new Error('Resource not found');
      }

      if (existingResource.creator_id !== user.id) {
        throw new Error('You can only delete your own resources');
      }

      // Perform the deletion
      const { error: deleteError } = await supabase
        .from('resources')
        .delete()
        .eq('id', resourceId)
        .eq('creator_id', user.id); // Additional safety check

      if (deleteError) {
        logApiResponse('DELETE', `supabase/resources/${resourceId}`, null, deleteError);
        throw new Error(`Failed to delete resource: ${deleteError.message}`);
      }

      logApiResponse('DELETE', `supabase/resources/${resourceId}`, { success: true });
      logger.info('✅ ResourceDeleter: Successfully deleted resource', { 
        resourceId,
        title: existingResource.title 
      });

      eventBus.emit('resource.deleted', { resourceId });
    } catch (error) {
      logger.error('❌ ResourceDeleter: Failed to delete resource', { error, resourceId });
      logApiResponse('DELETE', `supabase/resources/${resourceId}`, null, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      eventBus.emit('resource.delete.failed', { resourceId, error: errorMessage });
    }
  }
}