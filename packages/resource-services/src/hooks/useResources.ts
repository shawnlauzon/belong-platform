import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  supabase,
  Resource,
  calculateDrivingTime,
  useAppStore,
} from '@belongnetwork/core';
import { logger, logApiCall, logApiResponse } from '@belongnetwork/core';

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
          creator:profiles!resources_creator_id_fkey (
            id,
            email,
            user_metadata
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
          creator:profiles!resources_creator_id_fkey (
            id,
            email,
            user_metadata
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
    enabled: !!id,
  });
}

// export function useUpdateResource() {
//   const queryClient = useQueryClient();

//   return useMutation(
//     async ({ id, updates }: { id: string; updates: Partial<Resource> }) => {
//       logApiCall('updateResource', { id, updates });

//       const { data, error } = await supabase
//         .from('resources')
//         .update(updates)
//         .eq('id', id)
//         .select()
//         .single();

//       if (error) {
//         logApiResponse('updateResource', { error });
//         throw error;
//       }

//       logApiResponse('updateResource', { data });
//       return data;
//     },
//     {
//       onSuccess: (data) => {
//         // Invalidate both the resource list and the individual resource
//         void queryClient.invalidateQueries({ queryKey: ['resources'] });
//         void queryClient.invalidateQueries({
//           queryKey: ['resources', data.id],
//         });
//       },
//     }
//   );
// }

// export function useCreateResource() {
//   const queryClient = useQueryClient();
//   const user = useAppStore((state) => state.user);

//   return useMutation(
//     async (resource: Omit<Resource, 'id' | 'created_at' | 'creator_id'>) => {
//       if (!user) throw new Error('User must be logged in to create a resource');

//       logApiCall('createResource', { resource });

//       const { data, error } = await supabase
//         .from('resources')
//         .insert([
//           {
//             ...resource,
//             creator_id: user.id,
//             is_active: true,
//             times_helped: 0,
//           },
//         ])
//         .select()
//         .single();

//       if (error) {
//         logApiResponse('createResource', { error });
//         throw error;
//       }

//       logApiResponse('createResource', { data });
//       return data;
//     },
//     {
//       onSuccess: () => {
//         queryClient.invalidateQueries({ queryKey: ['resources'] });
//       },
//     }
//   );
// }
