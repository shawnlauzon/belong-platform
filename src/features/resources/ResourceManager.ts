import { supabase } from '@/lib/supabase';
import { calculateDrivingTime } from '@/lib/mapbox';
import { eventBus } from '@/core/eventBus';
import { Resource, Coordinates } from '@/types';
import { AppEvent } from '@/types/events';
import { useQueryClient } from '@tanstack/react-query';

export class ResourceManager {
  static initialize() {
    // Listen for resource creation requests
    eventBus.on('resource.create.requested', async (event: AppEvent) => {
      if (event.type !== 'resource.create.requested') return;
      
      try {
        const resource = await ResourceManager.createResource(event.data);
        
        if (!resource) throw new Error('Failed to create resource');
        
        // Emit success event
        eventBus.emit('resource.created', resource);
        
        // Invalidate the resources query to trigger a refetch
        const queryClient = useQueryClient();
        queryClient.invalidateQueries({ queryKey: ['resources'] });
      } catch (error) {
        console.error('Error creating resource:', error);
        eventBus.emit('resource.create.failed', { error });
      }
    });
  }

  static async getNearbyResources(
    userLocation: Coordinates,
    maxDriveMinutes: number = 8
  ): Promise<Resource[]> {
    try {
      const { data: resources, error } = await supabase
        .from('resources')
        .select(`
          *,
          users:member_id (
            id,
            email,
            raw_user_meta_data
          )
        `)
        .eq('is_active', true);

      if (error) throw error;
      if (!resources) return [];

      // Calculate driving times and filter by distance
      const resourcesWithDistances = await Promise.all(
        resources.map(async (resource) => {
          const location = {
            lat: resource.location.coordinates[1],
            lng: resource.location.coordinates[0]
          };
          
          const driveMinutes = await calculateDrivingTime(userLocation, location);
          
          return {
            ...resource,
            location,
            distance_minutes: driveMinutes
          };
        })
      );

      return resourcesWithDistances.filter(
        resource => resource.distance_minutes <= maxDriveMinutes
      );
    } catch (error) {
      console.error('Error getting nearby resources:', error);
      return [];
    }
  }

  static async createResource(resourceData: Partial<Resource>): Promise<Resource | null> {
    try {
      const { data: createdResource, error } = await supabase
        .from('resources')
        .insert([{
          ...resourceData,
          location: resourceData.location 
            ? `POINT(${resourceData.location.lng} ${resourceData.location.lat})`
            : null,
          created_at: new Date().toISOString(),
          times_helped: 0
        }])
        .select(`
          *,
          users:member_id (
            id,
            email,
            raw_user_meta_data
          )
        `)
        .single();

      if (error) throw error;
      if (!createdResource) return null;

      return {
        ...createdResource,
        location: createdResource.location ? {
          lat: createdResource.location.coordinates[1],
          lng: createdResource.location.coordinates[0]
        } : null
      };
    } catch (error) {
      console.error('Error creating resource:', error);
      return null;
    }
  }
}