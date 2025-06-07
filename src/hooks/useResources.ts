import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Resource } from '@/types';
import { calculateDrivingTime } from '@/lib/mapbox';
import { useAppStore } from '@/core/state';
import { logger, logApiCall, logApiResponse } from '@/lib/logger';

export function useResources(maxDriveMinutes = 8) {
  const userLocation = useAppStore((state) => state.userLocation);

  return useQuery({
    queryKey: ['resources', userLocation, maxDriveMinutes],
    queryFn: async () => {
      const { data: resources, error } = await supabase
        .from('resources')
        .select(
          `
          *,
          creator:auth.users!resources_creator_id_fkey (
            id,
            email,
            raw_user_meta_data
          )
        `
        )
        .eq('is_active', true);

      if (error) throw error;
      if (!resources) return [];

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
          const metadata = creator?.raw_user_meta_data || {};

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
                  trust_score: 5.0,
                  location: metadata.location || null,
                  community_tenure_months: 0,
                  thanks_received: 0,
                  resources_shared: 0,
                }
              : null,
          };
        })
      );

      return resourcesWithDistances.filter(
        (resource) =>
          !maxDriveMinutes ||
          !resource.distance_minutes ||
          resource.distance_minutes <= maxDriveMinutes
      );
    },
  });
}

export function useResource(id: string | undefined) {
  return useQuery({
    queryKey: ['resources', id],
    queryFn: async () => {
      if (!id) {
        throw new Error('Resource ID is required');
      }

      const { data, error } = await supabase
        .from('resources')
        .select(
          `
          *,
          creator:auth.users!resources_creator_id_fkey (
            id,
            email,
            raw_user_meta_data
          )
        `
        )
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Resource not found');

      const creator = data.creator;
      const metadata = creator?.raw_user_meta_data || {};

      return {
        ...data,
        location: data.location
          ? {
              lat: data.location.coordinates[1],
              lng: data.location.coordinates[0],
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
    },
    enabled: !!id, // Only run the query when id is truthy
  });
}

export function useUpdateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      resourceData: Partial<Resource> & { id: string }
    ): Promise<Resource> => {
      const { id, ...updateData } = resourceData;

      logger.debug('📦 useUpdateResource: Updating resource:', {
        id,
        updateData,
      });
      logApiCall('PATCH', `/resources/${id}`, updateData);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('User must be authenticated to update resources');
      }

      // Prepare the update data
      const dbUpdateData: any = {
        ...updateData,
        updated_at: new Date().toISOString(),
      };

      // Convert location to PostGIS format if provided
      if (updateData.location) {
        dbUpdateData.location = `POINT(${updateData.location.lng} ${updateData.location.lat})`;
      }

      // Remove fields that shouldn't be updated directly
      delete dbUpdateData.id;
      delete dbUpdateData.creator_id;
      delete dbUpdateData.created_at;
      delete dbUpdateData.times_helped;
      delete dbUpdateData.owner;
      delete dbUpdateData.distance_minutes;

      const { data: updatedResource, error } = await supabase
        .from('resources')
        .update(dbUpdateData)
        .eq('id', id)
        .eq('creator_id', user.id) // Ensure user can only update their own resources
        .select(
          `
          *,
          creator:auth.users!resources_creator_id_fkey (
            id,
            email,
            raw_user_meta_data
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
      const metadata = creator?.raw_user_meta_data || {};

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
      logger.info('✅ useUpdateResource: Resource updated successfully:', {
        id: transformedResource.id,
        title: transformedResource.title,
      });

      return transformedResource;
    },
    onSuccess: (updatedResource) => {
      // Invalidate and update queries
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.setQueryData(
        ['resources', updatedResource.id],
        updatedResource
      );
    },
  });
}
