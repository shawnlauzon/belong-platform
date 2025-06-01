import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
          owner:member_id (
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
          owner:member_id (
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
        location: {
          lat: data.location.coordinates[1],
          lng: data.location.coordinates[0]
        }
      };
    }
  });
}

export function useCreateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (resource: Partial<Resource>) => {
      const { data, error } = await supabase
        .from('resources')
        .insert([{
          ...resource,
          location: `POINT(${resource.location?.lng} ${resource.location?.lat})`,
          created_at: new Date().toISOString(),
          times_helped: 0
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    }
  });
}

export function useUpdateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Resource> }) => {
      const { data, error } = await supabase
        .from('resources')
        .update({
          ...updates,
          location: updates.location 
            ? `POINT(${updates.location.lng} ${updates.location.lat})`
            : undefined
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['resources', data.id] });
    }
  });
}