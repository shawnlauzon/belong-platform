import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Resource } from '@/types';
import { calculateDrivingTime } from '@/lib/mapbox';
import { useAppStore } from '@/core/state';

export function useResources(maxDriveMinutes = 8) {
  const userLocation = useAppStore(state => state.userLocation);

  return useQuery({
    queryKey: ['resources', userLocation, maxDriveMinutes],
    queryFn: async () => {
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
          
          return {
            ...resource,
            location,
            distance_minutes: driveMinutes,
            owner: resource.profiles ? {
              id: resource.profiles.id,
              name: resource.profiles.user_metadata?.full_name || resource.profiles.email?.split('@')[0] || 'Anonymous',
              avatar_url: resource.profiles.user_metadata?.avatar_url,
              trust_score: 5.0,
              location: resource.profiles.user_metadata?.location || null,
              community_tenure_months: 0,
              thanks_received: 0,
              resources_shared: 0
            } : null
          };
        })
      );

      return resourcesWithDistances.filter(
        resource => !maxDriveMinutes || !resource.distance_minutes || resource.distance_minutes <= maxDriveMinutes
      );
    }
  });
}

export function useResource(id: string) {
  return useQuery({
    queryKey: ['resources', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resources')
        .select(`
          *,
          profiles!resources_member_id_fkey (
            id,
            email,
            user_metadata
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Resource not found');

      return {
        ...data,
        location: data.location ? {
          lat: data.location.coordinates[1],
          lng: data.location.coordinates[0]
        } : null,
        owner: data.profiles ? {
          id: data.profiles.id,
          name: data.profiles.user_metadata?.full_name || data.profiles.email?.split('@')[0] || 'Anonymous',
          avatar_url: data.profiles.user_metadata?.avatar_url,
          trust_score: 5.0,
          location: data.profiles.user_metadata?.location || null,
          community_tenure_months: 0,
          thanks_received: 0,
          resources_shared: 0
        } : null
      };
    }
  });
}