import { supabase } from '@/lib/supabase';
import { calculateDrivingTime } from '@/lib/mapbox';
import { eventBus } from '@/core/eventBus';
import { Resource, Coordinates } from '@/types';
import { AppEvent } from '@/types/events';
import { Database } from '@/types/database';
import { logger, logApiCall, logApiResponse, logEvent } from '@/lib/logger';

export class ResourceManager {
  static initialize() {
    logger.info('🎯 ResourceManager: Initializing...');

    // Listen for resource creation requests
    eventBus.on('resource.create.requested', async (event: AppEvent) => {
      if (event.type !== 'resource.create.requested') return;

      logger.debug(
        '📦 ResourceManager: Resource creation requested:',
        event.data
      );

      try {
        const resource = await ResourceManager.createResource(event.data);

        if (!resource) throw new Error('Failed to create resource');

        // Emit success event
        logEvent('resource_created', resource);
        eventBus.emit('resource.created', resource);
        logger.info('✅ ResourceManager: Resource created successfully:', {
          id: resource.id,
        });
      } catch (error) {
        logger.error('❌ ResourceManager: Error creating resource:', error);
        eventBus.emit('resource.create.failed', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });

    // Listen for resource update requests
    eventBus.on('resource.update.requested', async (event: AppEvent) => {
      if (event.type !== 'resource.update.requested') return;

      logger.debug('📦 ResourceManager: Resource update requested:', event.data);

      try {
        const updatedResource = await ResourceManager.updateResource(event.data);

        if (!updatedResource) throw new Error('Failed to update resource');

        eventBus.emit('resource.updated', updatedResource);
        logger.info('✅ ResourceManager: Resource updated successfully:', {
          id: updatedResource.id,
        });
      } catch (error) {
        logger.error('❌ ResourceManager: Error updating resource:', error);
        eventBus.emit('resource.update.failed', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });

    logger.info('✅ ResourceManager: Initialized');
  }

  static async getNearbyResources(
    userLocation: Coordinates,
    maxDriveMinutes: number = 8
  ): Promise<Resource[]> {
    logger.debug('📦 ResourceManager: Getting nearby resources:', {
      userLocation,
      maxDriveMinutes,
    });

    try {
      logApiCall('GET', '/resources', { userLocation, maxDriveMinutes });

      const { data: resources, error } = await supabase
        .from('resources')
        .select(
          `
          *,
          creator:profiles!resources_creator_id_fkey (
            id,
            email,
            user_metadata
          )
        `
        )
        .eq('is_active', true);

      if (error) {
        logApiResponse('GET', '/resources', null, error);
        throw error;
      }

      if (!resources) {
        logApiResponse('GET', '/resources', []);
        return [];
      }

      logger.debug('📦 ResourceManager: Raw resources fetched:', {
        count: resources.length,
      });

      // Calculate driving times and filter by distance
      const resourcesWithDistances = await Promise.all(
        resources.map(async (resource) => {
          const location = resource.location
            ? {
                lat: resource.location.coordinates[1],
                lng: resource.location.coordinates[0],
              }
            : null;

          const driveMinutes = location
            ? await calculateDrivingTime(userLocation, location)
            : null;

          const creator = resource.creator;
          const metadata = creator?.user_metadata || {};

          return {
            ...resource,
            location,
            distance_minutes: driveMinutes,
            owner: creator
              ? {
                  id: creator.id,
                  name:
                    metadata.full_name ||
                    creator.email?.split('@')[0] ||
                    'Anonymous',
                  avatar_url: metadata.avatar_url || null,
                  trust_score: 5.0, // Default until we implement trust scoring
                  location: metadata.location || null,
                  community_tenure_months: 0, // Default until we implement tenure tracking
                  thanks_received: 0, // Default until we implement thanks
                  resources_shared: 0, // Will be calculated from resources table
                }
              : null,
          };
        })
      );

      const filteredResources = resourcesWithDistances.filter(
        (resource) =>
          !maxDriveMinutes ||
          !resource.distance_minutes ||
          resource.distance_minutes <= maxDriveMinutes
      );

      logApiResponse('GET', '/resources', {
        totalCount: resources.length,
        filteredCount: filteredResources.length,
      });

      logger.info('📦 ResourceManager: Nearby resources retrieved:', {
        total: resources.length,
        filtered: filteredResources.length,
      });

      return filteredResources;
    } catch (error) {
      logger.error(
        '❌ ResourceManager: Error getting nearby resources:',
        error
      );
      logApiResponse('GET', '/resources', null, error);
      return [];
    }
  }

  static async createResource(
    resourceData: Partial<Resource>
  ): Promise<Resource | null> {
    logger.debug('📦 ResourceManager: Creating resource:', resourceData);

    try {
      logApiCall('POST', '/resources', resourceData);

      const { data: createdResource, error } = await supabase
        .from('resources')
        .insert([
          {
            ...resourceData,
            location: resourceData.location
              ? `POINT(${resourceData.location.lng} ${resourceData.location.lat})`
              : null,
            created_at: new Date().toISOString(),
            times_helped: 0,
          },
        ])
        .select(
          `
          *,
          creator:profiles!resources_creator_id_fkey (
            id,
            email,
            user_metadata
          )
        `
        )
        .single();

      if (error) {
        logApiResponse('POST', '/resources', null, error);
        throw error;
      }

      if (!createdResource) {
        logApiResponse('POST', '/resources', null, 'No resource returned');
        return null;
      }

      const creator = createdResource.creator;
      const metadata = creator?.user_metadata || {};

      const resource = {
        ...createdResource,
        location: createdResource.location
          ? {
              lat: createdResource.location.coordinates[1],
              lng: createdResource.location.coordinates[0],
            }
          : null,
        owner: creator
          ? {
              id: creator.id,
              name:
                metadata.full_name ||
                creator.email?.split('@')[0] ||
                'Anonymous',
              avatar_url: metadata.avatar_url || null,
              trust_score: 5.0,
              location: metadata.location || null,
              community_tenure_months: 0,
              thanks_received: 0,
              resources_shared: 0,
            }
          : null,
      };

      logApiResponse('POST', '/resources', { id: resource.id });
      logger.info('✅ ResourceManager: Resource created:', {
        id: resource.id,
        title: resource.title,
      });

      return resource;
    } catch (error) {
      logger.error('❌ ResourceManager: Error creating resource:', error);
      logApiResponse('POST', '/resources', null, error);
      return null;
    }
  }

  static async updateResource(
    resourceData: Partial<Resource> & { id: string }
  ): Promise<Resource | null> {
    const { id, ...updateData } = resourceData;

    logger.debug('📦 ResourceManager: Updating resource:', {
      id,
      updateData,
    });

    try {
      logApiCall('PATCH', `/resources/${id}`, updateData);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('User must be authenticated to update resources');
      }

      // Prepare the update data
      const dbUpdateData: Partial<Database['public']['Tables']['resources']['Update']> = {
        ...updateData,
        updated_at: new Date().toISOString(),
      };

      // Convert location to PostGIS format if provided
      if (updateData.location) {
        dbUpdateData.location = `POINT(${updateData.location.lng} ${updateData.location.lat})` as any;
      }

      // Remove fields that shouldn't be updated directly
      delete (dbUpdateData as any).id;
      delete (dbUpdateData as any).creator_id;
      delete (dbUpdateData as any).created_at;
      delete (dbUpdateData as any).times_helped;
      delete (dbUpdateData as any).owner;
      delete (dbUpdateData as any).distance_minutes;

      const { data: updatedResource, error } = await supabase
        .from('resources')
        .update(dbUpdateData)
        .eq('id', id)
        .eq('creator_id', user.id) // Ensure user can only update their own resources
        .select(
          `
          *,
          creator:profiles!resources_creator_id_fkey (
            id,
            email,
            user_metadata
          )
        `
        )
        .single();

      if (error) {
        logApiResponse('PATCH', `/resources/${id}`, null, error);
        throw error;
      }

      if (!updatedResource) {
        throw new Error('Failed to update resource');
      }

      const creator = updatedResource.creator;
      const metadata = creator?.user_metadata || {};

      const transformedResource: Resource = {
        ...updatedResource,
        location: updatedResource.location
          ? {
              lat: updatedResource.location.coordinates[1],
              lng: updatedResource.location.coordinates[0],
            }
          : null,
        owner: creator
          ? {
              id: creator.id,
              name:
                metadata.full_name ||
                creator.email?.split('@')[0] ||
                'Anonymous',
              avatar_url: metadata.avatar_url || null,
              trust_score: 5.0,
              location: metadata.location || null,
              community_tenure_months: 0,
              thanks_received: 0,
              resources_shared: 0,
            }
          : null,
      };

      logApiResponse('PATCH', `/resources/${id}`, {
        id: transformedResource.id,
      });
      logger.info('✅ ResourceManager: Resource updated successfully:', {
        id: transformedResource.id,
        title: transformedResource.title,
      });

      return transformedResource;
    } catch (error) {
      logger.error('❌ ResourceManager: Error updating resource:', error);
      logApiResponse('PATCH', `/resources/${id}`, null, error);
      return null;
    }
  }
}