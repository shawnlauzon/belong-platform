import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { logger, queryKeys } from '../../../shared';
import { useSupabase } from '../../../shared';
import { createShoutoutsService } from '../services/shoutouts.service';
import { STANDARD_CACHE_TIME } from '../../../config';
import type { ShoutoutInfo, ShoutoutData, ShoutoutFilter } from '../types';

/**
 * Comprehensive hook for shoutout operations including fetching, creating, and filtering.
 *
 * This hook provides functionality for managing community appreciation posts (shoutouts)
 * where users can publicly recognize and thank others for their contributions.
 * Must be used within a BelongProvider context.
 *
 * @returns Shoutout queries, mutations, and utility functions
 *
 * @example
 * ```tsx
 * function ShoutoutList() {
 *   const {
 *     fetchShoutouts,
 *     createShoutout,
 *     shoutoutsQuery
 *   } = useShoutouts();
 *
 *   // Load shoutouts manually
 *   const handleLoad = () => {
 *     fetchShoutouts();
 *   };
 *
 *   // Create a new shoutout
 *   const handleCreate = async () => {
 *     try {
 *       const shoutout = await createShoutout.mutateAsync({
 *         message: 'Thanks for organizing the cleanup event!',
 *         recipientId: 'user-456',
 *         resourceId: 'resource-123', // optional - related resource
 *         isPublic: true
 *       });
 *       console.log('Created shoutout:', shoutout.message);
 *     } catch (error) {
 *       console.error('Failed to create shoutout:', error);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={handleLoad}>Load Shoutouts</button>
 *       <button onClick={handleCreate}>Give Thanks</button>
 *       {shoutoutsQuery.data?.map(shoutout => (
 *         <div key={shoutout.id}>{shoutout.message}</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 *
 * @category React Hooks
 */
export function useShoutouts() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const shoutoutsService = createShoutoutsService(supabase);

  // List shoutouts query - disabled by default to prevent automatic fetching
  const shoutoutsQuery = useQuery<ShoutoutInfo[], Error>({
    queryKey: queryKeys.shoutouts.all,
    queryFn: () => shoutoutsService.fetchShoutouts(),
    staleTime: STANDARD_CACHE_TIME,
    enabled: false, // Prevent automatic fetching
  });

  // Note: Individual query hooks should be called separately by consumers
  // These factory functions violated Rules of Hooks and have been removed

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: ShoutoutData) => shoutoutsService.createShoutout(data),
    onSuccess: (newShoutout) => {
      // Invalidate all shoutout queries
      queryClient.invalidateQueries({ queryKey: ['shoutouts'] });

      // Update the cache for this specific shoutout
      queryClient.setQueryData(
        queryKeys.shoutouts.byId(newShoutout.id),
        newShoutout
      );

      logger.info(
        '📢 API: Successfully created shoutout via consolidated hook',
        {
          id: newShoutout.id,
          message: newShoutout.message,
          fromUserId: newShoutout.fromUser?.id,
          toUserId: newShoutout.toUser?.id,
        }
      );
    },
    onError: (error) => {
      logger.error('📢 API: Failed to create shoutout via consolidated hook', {
        error,
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ShoutoutData> }) =>
      shoutoutsService.updateShoutout(id, data),
    onSuccess: (updatedShoutout) => {
      // Invalidate all shoutout queries
      queryClient.invalidateQueries({ queryKey: ['shoutouts'] });

      // Update the cache for this specific shoutout
      queryClient.setQueryData(
        queryKeys.shoutouts.byId(updatedShoutout.id),
        updatedShoutout
      );

      logger.info(
        '📢 API: Successfully updated shoutout via consolidated hook',
        {
          id: updatedShoutout.id,
          message: updatedShoutout.message,
        }
      );
    },
    onError: (error) => {
      logger.error('📢 API: Failed to update shoutout via consolidated hook', {
        error,
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => shoutoutsService.deleteShoutout(id),
    onSuccess: (_, shoutoutId) => {
      // Invalidate all shoutout queries
      queryClient.invalidateQueries({ queryKey: ['shoutouts'] });
      queryClient.removeQueries({
        queryKey: queryKeys.shoutouts.byId(shoutoutId),
      });

      logger.info(
        '📢 API: Successfully deleted shoutout via consolidated hook',
        {
          id: shoutoutId,
        }
      );
    },
    onError: (error) => {
      logger.error('📢 API: Failed to delete shoutout via consolidated hook', {
        error,
      });
    },
  });

  // Handle list query errors
  if (shoutoutsQuery.error) {
    logger.error('📢 API: Error fetching shoutouts via consolidated hook', {
      error: shoutoutsQuery.error,
    });
  }

  return {
    // Unified React Query status properties (query + mutations)
    // Note: For disabled queries, we only consider them pending if they're actually fetching
    isPending:
      shoutoutsQuery.isFetching ||
      (createMutation && createMutation.isPending) ||
      (updateMutation && updateMutation.isPending) ||
      (deleteMutation && deleteMutation.isPending),
    isError:
      shoutoutsQuery.isError ||
      createMutation?.isError ||
      updateMutation?.isError ||
      deleteMutation?.isError,
    isSuccess:
      shoutoutsQuery.isSuccess ||
      createMutation?.isSuccess ||
      updateMutation?.isSuccess ||
      deleteMutation?.isSuccess,
    isFetching: shoutoutsQuery.isFetching, // Only for query operations
    error:
      shoutoutsQuery.error ||
      createMutation?.error ||
      updateMutation?.error ||
      deleteMutation?.error,

    // List fetch operation
    list: async (filters?: ShoutoutFilter) => {
      const result = await queryClient.fetchQuery({
        queryKey: filters
          ? queryKeys.shoutouts.filtered(filters)
          : queryKeys.shoutouts.all,
        queryFn: () => shoutoutsService.fetchShoutouts(filters),
        staleTime: STANDARD_CACHE_TIME,
      });
      return result;
    },

    // Individual item fetch operation
    byId: async (id: string) => {
      const result = await queryClient.fetchQuery({
        queryKey: queryKeys.shoutouts.byId(id),
        queryFn: () => shoutoutsService.fetchShoutoutById(id),
        staleTime: STANDARD_CACHE_TIME,
      });
      return result;
    },

    // Mutations - type-safe wrapper functions to prevent parameter misuse
    create: (data: ShoutoutData) => {
      return createMutation?.mutateAsync
        ? createMutation.mutateAsync(data)
        : Promise.reject(new Error('Create mutation not ready'));
    },
    update: (id: string, data: Partial<ShoutoutData>) =>
      updateMutation?.mutateAsync
        ? updateMutation.mutateAsync({ id, data })
        : Promise.reject(new Error('Update mutation not ready')),
    delete: (id: string) => {
      return deleteMutation?.mutateAsync
        ? deleteMutation.mutateAsync(id)
        : Promise.reject(new Error('Delete mutation not ready'));
    },

    // Individual mutation objects for specific access when needed
    createMutation,
    updateMutation,
    deleteMutation,

    // Raw queries for advanced usage
    shoutoutsQuery,
  };
}
