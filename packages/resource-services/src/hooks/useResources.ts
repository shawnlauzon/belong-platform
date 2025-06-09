import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  supabase,
  Resource,
  calculateDrivingTime,
  useBelongStore,
} from '@belongnetwork/core';
import { logger, logApiCall, logApiResponse } from '@belongnetwork/core';

export function useResources(maxDriveMinutes = 8) {
  const userLocation = useBelongStore((state) => state.auth.location);

  return useQuery({
    queryKey: ['resources', userLocation, maxDriveMinutes],
    queryFn: async () => {
      const { data: resources, error } = await supabase
        .from('resources')
        .select(
          `
          *,
          creator:profiles!resources_creator_id_fkey (
            id,
            email,
            user_metadata,
            created_at,
            updated_at
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

          const driveMinutes =
            userLocation && location
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
                  email: creator.email || '',
                  first_name: metadata.first_name || '',
                  last_name: metadata.last_name || '',
                  full_name: metadata.full_name || metadata.first_name + ' ' + (metadata.last_name || '') || creator.email?.split('@')[0] || 'Anonymous',
                  avatar_url: metadata.avatar_url || null,
                  location: metadata.location || null,
                  address: metadata.address || null,
                  created_at: creator.created_at,
                  updated_at: creator.updated_at,
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
          creator:profiles!resources_creator_id_fkey (
            id,
            email,
            user_metadata,
            created_at,
            updated_at
          )
        `
        )
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Resource not found');

      const creator = data.creator;
      const metadata = creator?.user_metadata || {};

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
              email: creator.email || '',
              first_name: metadata.first_name || '',
              last_name: metadata.last_name || '',
              full_name: metadata.full_name || metadata.first_name + ' ' + (metadata.last_name || '') || creator.email?.split('@')[0] || 'Anonymous',
              avatar_url: metadata.avatar_url || null,
              location: metadata.location || null,
              address: metadata.address || null,
              created_at: creator.created_at,
              updated_at: creator.updated_at,
            }
          : null,
      };
    },
    enabled: !!id,
  });
}