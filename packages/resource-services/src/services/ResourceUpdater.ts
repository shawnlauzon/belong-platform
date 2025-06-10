import { supabase, eventBus, logger, logApiCall, logApiResponse } from '@belongnetwork/core';
import type { AppEvent, Resource } from '@belongnetwork/core';
import { toDbResource, toDomainResource } from '../transformers/resourceTransformer';

export class ResourceUpdater {
  private static initialized = false;

  static initialize(): void {
    if (this.initialized) {
      logger.debug('✏️ ResourceUpdater: Already initialized, skipping...');
      return;
    }

    logger.info('🚀 ResourceUpdater: Initializing...');

    eventBus.on('resource.update.requested', (event: AppEvent) => {
      if (event.type !== 'resource.update.requested') {
        logger.error('✏️ ResourceUpdater: Received invalid event type', { event });
        return;
      }

      logger.debug('✏️ ResourceUpdater: Update requested', { resourceData: event.data });
      this._updateResource(event.data);
    });

    this.initialized = true;
    logger.info('✅ ResourceUpdater: Initialized successfully');
  }

  private static async _updateResource(updateData: Partial<Resource> & { id: string }): Promise<void> {
    logger.debug('✏️ ResourceUpdater: Starting resource update', { 
      resourceId: updateData.id,
      updateData 
    });

    try {
      const { id, ...fieldsToUpdate } = updateData;

      // Convert domain model to database model
      const dbUpdate = toDbResource(fieldsToUpdate, true);
      
      // Add updated_at timestamp
      dbUpdate.updated_at = new Date().toISOString();

      logApiCall('PATCH', `supabase/resources/${id}`, dbUpdate);

      const { data, error } = await supabase
        .from('resources')
        .update(dbUpdate)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        logApiResponse('PATCH', `supabase/resources/${id}`, null, error);
        throw new Error(`Failed to update resource: ${error.message}`);
      }

      if (!data) {
        logApiResponse('PATCH', `supabase/resources/${id}`, null, 'No data returned');
        throw new Error('Failed to update resource: No data returned');
      }

      // Convert database model back to domain model
      const updatedResource = toDomainResource(data);

      logApiResponse('PATCH', `supabase/resources/${id}`, { resourceId: updatedResource.id });
      logger.info('✅ ResourceUpdater: Successfully updated resource', { 
        resourceId: updatedResource.id,
        title: updatedResource.title 
      });

      eventBus.emit('resource.updated', updatedResource);
    } catch (error) {
      logger.error('❌ ResourceUpdater: Failed to update resource', { 
        error, 
        resourceId: updateData.id 
      });
      logApiResponse('PATCH', `supabase/resources/${updateData.id}`, null, error);
      
      eventBus.emit('resource.update.failed', { 
        error: `Failed to update resource ${updateData.id}: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }
}