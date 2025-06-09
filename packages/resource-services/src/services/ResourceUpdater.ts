import { supabase, eventBus, logger, logApiCall, logApiResponse } from '@belongnetwork/core';
import type { Resource, AppEvent } from '@belongnetwork/core';

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

  private static async _updateResource(updateData: any): Promise<void> {
    logger.debug('✏️ ResourceUpdater: Starting resource update', { 
      resourceId: updateData.id,
      updateData 
    });

    try {
      const { id, ...fieldsToUpdate } = updateData;

      // Convert location if it's being updated
      if (fieldsToUpdate.location && typeof fieldsToUpdate.location === 'object') {
        fieldsToUpdate.location = `POINT(${fieldsToUpdate.location.lng} ${fieldsToUpdate.location.lat})`;
      }

      // Add updated_at timestamp
      fieldsToUpdate.updated_at = new Date().toISOString();

      logApiCall('PATCH', `supabase/resources/${id}`, fieldsToUpdate);

      const { data, error } = await supabase
        .from('resources')
        .update(fieldsToUpdate)
        .eq('id', id)
        .select(`
          id,
          creator_id,
          type,
          category,
          title,
          description,
          image_urls,
          location,
          pickup_instructions,
          parking_info,
          meetup_flexibility,
          availability,
          is_active,
          times_helped,
          created_at,
          updated_at
        `)
        .single();

      if (error) {
        logApiResponse('PATCH', `supabase/resources/${id}`, null, error);
        throw new Error(`Failed to update resource: ${error.message}`);
      }

      if (!data) {
        logApiResponse('PATCH', `supabase/resources/${id}`, null, 'No data returned');
        throw new Error('Failed to update resource: No data returned');
      }

      // Transform the response to match our Resource interface
      let location = { lat: 0, lng: 0 };

      // Parse the PostGIS POINT format: "POINT(lng lat)"
      if (data.location && typeof data.location === 'string') {
        const match = data.location.match(/POINT\(([^)]+)\)/);
        if (match) {
          const [lng, lat] = match[1].split(' ').map(Number);
          if (!isNaN(lng) && !isNaN(lat)) {
            location = { lat, lng };
          }
        }
      } else if (data.location && typeof data.location === 'object') {
        location = data.location;
      }

      const updatedResource: Resource = {
        id: data.id,
        creator_id: data.creator_id,
        type: data.type,
        category: data.category,
        title: data.title,
        description: data.description,
        image_urls: data.image_urls || [],
        location,
        pickup_instructions: data.pickup_instructions,
        parking_info: data.parking_info,
        meetup_flexibility: data.meetup_flexibility,
        availability: data.availability,
        is_active: data.is_active,
        times_helped: data.times_helped || 0,
        created_at: data.created_at,
      };

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
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      eventBus.emit('resource.update.failed', { error: errorMessage });
    }
  }
}