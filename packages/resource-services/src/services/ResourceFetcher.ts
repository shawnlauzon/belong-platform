import { supabase } from '@belongnetwork/core';
import { eventBus } from '@belongnetwork/core';
import { logger, logApiCall, logApiResponse } from '@belongnetwork/core';
import type { Resource, Coordinates } from '@belongnetwork/core';
import type { AppEvent } from '@belongnetwork/core';

export class ResourceFetcher {
  private static initialized = false;

  static initialize(): void {
    if (this.initialized) {
      logger.debug('🔄 ResourceFetcher: Already initialized, skipping...');
      return;
    }

    logger.info('🚀 ResourceFetcher: Initializing...');

    eventBus.on('resource.fetch.requested', (event: AppEvent) => {
      if (event.type !== 'resource.fetch.requested') {
        logger.error('🔄 ResourceFetcher: Received invalid event type', { event });
        return;
      }

      logger.debug('🔄 ResourceFetcher: Fetch requested', { filters: event.data.filters });
      this._fetchResources(event.data.filters);
    });

    this.initialized = true;
    logger.info('✅ ResourceFetcher: Initialized successfully');
  }

  private static async _fetchResources(filters?: any): Promise<void> {
    logger.debug('🔄 ResourceFetcher: Starting resource fetch', { filters });

    try {
      logApiCall('GET', 'supabase/resources', { filters });

      // Build the query
      let query = supabase
        .from('resources')
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
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      // Apply filters if provided
      if (filters) {
        if (filters.category && filters.category !== 'all') {
          query = query.eq('category', filters.category);
        }
        if (filters.type && filters.type !== 'all') {
          query = query.eq('type', filters.type);
        }
        if (filters.searchTerm) {
          query = query.or(`title.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%`);
        }
      }

      const { data, error } = await query;

      if (error) {
        logApiResponse('GET', 'supabase/resources', null, error);
        throw new Error(`Failed to fetch resources: ${error.message}`);
      }

      if (!data) {
        logApiResponse('GET', 'supabase/resources', { count: 0 });
        logger.warn('🔄 ResourceFetcher: No data returned from query');
        eventBus.emit('resource.fetch.success', { resources: [] });
        return;
      }

      // Transform the data to match our Resource interface
      const resources: Resource[] = data.map((row: any) => {
        let location: Coordinates = { lat: 0, lng: 0 };

        // Parse the PostGIS POINT format: "POINT(lng lat)"
        if (row.location && typeof row.location === 'string') {
          const match = row.location.match(/POINT\(([^)]+)\)/);
          if (match) {
            const [lng, lat] = match[1].split(' ').map(Number);
            if (!isNaN(lng) && !isNaN(lat)) {
              location = { lat, lng };
            } else {
              logger.warn('🔄 ResourceFetcher: Invalid coordinates in location string', {
                resourceId: row.id,
                locationString: row.location
              });
            }
          } else {
            logger.warn('🔄 ResourceFetcher: Could not parse location string', {
              resourceId: row.id,
              locationString: row.location
            });
          }
        } else if (row.location && typeof row.location === 'object') {
          // Handle if location is already parsed as an object
          location = row.location;
        }

        return {
          id: row.id,
          creator_id: row.creator_id,
          type: row.type,
          category: row.category,
          title: row.title,
          description: row.description,
          image_urls: row.image_urls || [],
          location,
          pickup_instructions: row.pickup_instructions,
          parking_info: row.parking_info,
          meetup_flexibility: row.meetup_flexibility,
          availability: row.availability,
          is_active: row.is_active,
          times_helped: row.times_helped || 0,
          created_at: row.created_at,
        };
      });

      logApiResponse('GET', 'supabase/resources', { count: resources.length });
      logger.info('✅ ResourceFetcher: Successfully fetched resources', { count: resources.length });

      eventBus.emit('resource.fetch.success', { resources });
    } catch (error) {
      logger.error('❌ ResourceFetcher: Failed to fetch resources', { error });
      logApiResponse('GET', 'supabase/resources', null, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      eventBus.emit('resource.fetch.failed', { error: errorMessage });
    }
  }
}