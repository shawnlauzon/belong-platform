import { supabase, eventBus, logger, logApiCall, logApiResponse } from '@belongnetwork/core';
import type { Resource, AppEvent } from '@belongnetwork/core';

export class ResourceCreator {
  private static initialized = false;

  static initialize(): void {
    if (this.initialized) {
      logger.debug('➕ ResourceCreator: Already initialized, skipping...');
      return;
    }

    logger.info('🚀 ResourceCreator: Initializing...');

    eventBus.on('resource.create.requested', (event: AppEvent) => {
      if (event.type !== 'resource.create.requested') {
        logger.error('➕ ResourceCreator: Received invalid event type', { event });
        return;
      }

      logger.debug('➕ ResourceCreator: Create requested', { resourceData: event.data });
      this._createResource(event.data);
    });

    this.initialized = true;
    logger.info('✅ ResourceCreator: Initialized successfully');
  }

  private static async _createResource(resourceData: any): Promise<void> {
    logger.debug('➕ ResourceCreator: Starting resource creation', { resourceData });

    try {
      // Convert location from { lat, lng } to PostGIS POINT format
      const locationPoint = `POINT(${resourceData.location.lng} ${resourceData.location.lat})`;

      const insertData = {
        ...resourceData,
        location: locationPoint,
        is_active: true,
        times_helped: 0,
      };

      logApiCall('POST', 'supabase/resources', insertData);

      const { data, error } = await supabase
        .from('resources')
        .insert([insertData])
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
        logApiResponse('POST', 'supabase/resources', null, error);
        throw new Error(`Failed to create resource: ${error.message}`);
      }

      if (!data) {
        logApiResponse('POST', 'supabase/resources', null, 'No data returned');
        throw new Error('Failed to create resource: No data returned');
      }

      // Transform the response to match our Resource interface
      const location = { lat: resourceData.location.lat, lng: resourceData.location.lng };

      const createdResource: Resource = {
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

      logApiResponse('POST', 'supabase/resources', { resourceId: createdResource.id });
      logger.info('✅ ResourceCreator: Successfully created resource', { 
        resourceId: createdResource.id,
        title: createdResource.title 
      });

      eventBus.emit('resource.created', createdResource);
    } catch (error) {
      logger.error('❌ ResourceCreator: Failed to create resource', { error, resourceData });
      logApiResponse('POST', 'supabase/resources', null, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      eventBus.emit('resource.create.failed', { error: errorMessage });
    }
  }
}