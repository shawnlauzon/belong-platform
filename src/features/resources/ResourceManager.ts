import { supabase } from '@/lib/supabase';
import { calculateDrivingTime } from '@/lib/mapbox';
import { eventBus } from '@/core/eventBus';
import { Resource, Coordinates } from '@/types';
import { AppEvent } from '@/types/events';

export class ResourceManager {
  static initialize() {
    // Listen for resource creation requests
    eventBus.on('resource.create.requested', async (event: AppEvent) => {
      if (event.type !== 'resource.create.requested') return;
      
      try {
        // Get the current user's ID
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Must be authenticated to create resources');

        const resource = await ResourceManager.createResource({
          ...event.data,
          member_id: user.id // Ensure we set the current user's ID
        });
        
        if (!resource) throw new Error('Failed to create resource');
        eventBus.emit('resource.created', resource);
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
      // Get resources from Supabase
      const { data: resources, error } = await supabase
        .from('resources')
        .select('*')
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
      // Get the current user's ID if not provided
      if (!resourceData.member_id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Must be authenticated to create resources');
        resourceData.member_id = user.id;
      }

      const { data: createdResource, error } = await supabase
        .from('resources')
        .insert([{
          ...resourceData,
          location: `POINT(${resourceData.location?.lng} ${resourceData.location?.lat})`,
          created_at: new Date().toISOString(),
          times_helped: 0
        }])
        .select('*')
        .single();

      if (error) throw error;
      if (!createdResource) return null;

      // Convert PostGIS point back to coordinates
      return {
        ...createdResource,
        location: {
          lat: createdResource.location.coordinates[1],
          lng: createdResource.location.coordinates[0]
        }
      };
    } catch (error) {
      console.error('Error creating resource:', error);
      return null;
    }
  }

  static async getResourceById(id: string): Promise<Resource | null> {
    try {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) return null;

      return {
        ...data,
        location: {
          lat: data.location.coordinates[1],
          lng: data.location.coordinates[0]
        }
      };
    } catch (error) {
      console.error('Error getting resource by ID:', error);
      return null;
    }
  }

  static async updateResource(id: string, updates: Partial<Resource>): Promise<Resource | null> {
    try {
      // Get the current user's ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Must be authenticated to update resources');

      const { data: updatedData, error } = await supabase
        .from('resources')
        .update({
          ...updates,
          member_id: user.id, // Ensure we're setting the current user's ID
          location: updates.location 
            ? `POINT(${updates.location.lng} ${updates.location.lat})`
            : undefined
        })
        .eq('id', id)
        .eq('member_id', user.id) // Only update if the user owns the resource
        .select('*')
        .single();

      if (error) throw error;
      if (!updatedData) return null;

      const updatedResource = {
        ...updatedData,
        location: {
          lat: updatedData.location.coordinates[1],
          lng: updatedData.location.coordinates[0]
        }
      };

      eventBus.emit('resource.updated', updatedResource);
      return updatedResource;
    } catch (error) {
      console.error('Error updating resource:', error);
      return null;
    }
  }
}