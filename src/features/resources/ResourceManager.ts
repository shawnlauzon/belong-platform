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
        const resource = await ResourceManager.createResource(event.data);
        
        if (!resource) throw new Error('Failed to create resource');
        
        // Emit success event
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
      const { data: resources, error } = await supabase
        .from('resources')
        .select(`
          *,
          profiles!resources_member_id_fkey (
            id,
            email,
            user_metadata
          )
        `)
        .eq('is_active', true);

      if (error) throw error;
      if (!resources) return [];

      // Calculate driving times and filter by distance
      const resourcesWithDistances = await Promise.all(
        resources.map(async (resource) => {
          const location = resource.location ? {
            lat: resource.location.coordinates[1],
            lng: resource.location.coordinates[0]
          } : null;
          
          const driveMinutes = location ? await calculateDrivingTime(userLocation, location) : null;
          
          const profile = resource.profiles;
          const metadata = profile?.user_metadata || {};
          
          return {
            ...resource,
            location,
            distance_minutes: driveMinutes,
            owner: profile ? {
              id: profile.id,
              name: metadata.full_name || profile.email?.split('@')[0] || 'Anonymous',
              avatar_url: metadata.avatar_url || null,
              trust_score: 5.0, // Default until we implement trust scoring
              location: metadata.location || null,
              community_tenure_months: 0, // Default until we implement tenure tracking
              thanks_received: 0, // Default until we implement thanks
              resources_shared: 0 // Will be calculated from resources table
            } : null
          };
        })
      );

      return resourcesWithDistances.filter(
        resource => !maxDriveMinutes || !resource.distance_minutes || resource.distance_minutes <= maxDriveMinutes
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
          profiles!resources_member_id_fkey (
            id,
            email,
            user_metadata
          )
        `)
        .single();

      if (error) throw error;
      if (!createdResource) return null;

      const profile = createdResource.profiles;
      const metadata = profile?.user_metadata || {};

      return {
        ...createdResource,
        location: createdResource.location ? {
          lat: createdResource.location.coordinates[1],
          lng: createdResource.location.coordinates[0]
        } : null,
        owner: profile ? {
          id: profile.id,
          name: metadata.full_name || profile.email?.split('@')[0] || 'Anonymous',
          avatar_url: metadata.avatar_url || null,
          trust_score: 5.0,
          location: metadata.location || null,
          community_tenure_months: 0,
          thanks_received: 0,
          resources_shared: 0
        } : null
      };
    } catch (error) {
      console.error('Error creating resource:', error);
      return null;
    }
  }
}