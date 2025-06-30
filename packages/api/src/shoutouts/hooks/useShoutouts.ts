import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { logger } from "@belongnetwork/core";
import { useSupabase } from "../../auth/providers/CurrentUserProvider";
import { createShoutoutsService } from "../services/shoutouts.service";
import { queryKeys, STANDARD_CACHE_TIME } from "../../shared";
import type {
  Shoutout,
  ShoutoutInfo,
  ShoutoutData,
  ShoutoutFilter,
} from "@belongnetwork/types";

/**
 * Consolidated hook for all shoutout operations
 * Provides queries, mutations, and state management for shoutouts
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
      queryClient.invalidateQueries({ queryKey: ["shoutouts"] });

      // Update the cache for this specific shoutout
      queryClient.setQueryData(queryKeys.shoutouts.byId(newShoutout.id), newShoutout);

      logger.info("📢 API: Successfully created shoutout via consolidated hook", {
        id: newShoutout.id,
        message: newShoutout.message,
        fromUserId: newShoutout.fromUser?.id,
        toUserId: newShoutout.toUser?.id,
      });
    },
    onError: (error) => {
      logger.error("📢 API: Failed to create shoutout via consolidated hook", {
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
      queryClient.invalidateQueries({ queryKey: ["shoutouts"] });

      // Update the cache for this specific shoutout
      queryClient.setQueryData(
        queryKeys.shoutouts.byId(updatedShoutout.id),
        updatedShoutout,
      );

      logger.info("📢 API: Successfully updated shoutout via consolidated hook", {
        id: updatedShoutout.id,
        message: updatedShoutout.message,
      });
    },
    onError: (error) => {
      logger.error("📢 API: Failed to update shoutout via consolidated hook", {
        error,
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => shoutoutsService.deleteShoutout(id),
    onSuccess: (_, shoutoutId) => {
      // Invalidate all shoutout queries
      queryClient.invalidateQueries({ queryKey: ["shoutouts"] });
      queryClient.removeQueries({
        queryKey: queryKeys.shoutouts.byId(shoutoutId),
      });

      logger.info("📢 API: Successfully deleted shoutout via consolidated hook", {
        id: shoutoutId,
      });
    },
    onError: (error) => {
      logger.error("📢 API: Failed to delete shoutout via consolidated hook", {
        error,
      });
    },
  });

  // Handle list query errors
  if (shoutoutsQuery.error) {
    logger.error("📢 API: Error fetching shoutouts via consolidated hook", {
      error: shoutoutsQuery.error,
    });
  }

  return {
    // Unified React Query status properties (query + mutations)
    // Note: For disabled queries, we only consider them pending if they're actually fetching
    isPending: shoutoutsQuery.isFetching || 
               (createMutation && createMutation.isPending) || 
               (updateMutation && updateMutation.isPending) || 
               (deleteMutation && deleteMutation.isPending) || 
               false,
    isError: shoutoutsQuery.isError || (createMutation?.isError || false) || (updateMutation?.isError || false) || (deleteMutation?.isError || false),
    isSuccess: shoutoutsQuery.isSuccess || (createMutation?.isSuccess || false) || (updateMutation?.isSuccess || false) || (deleteMutation?.isSuccess || false),
    isFetching: shoutoutsQuery.isFetching, // Only for query operations
    error: shoutoutsQuery.error || createMutation?.error || updateMutation?.error || deleteMutation?.error,

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
      return createMutation?.mutateAsync ? createMutation.mutateAsync(data) : Promise.reject(new Error('Create mutation not ready'));
    },
    update: (id: string, data: Partial<ShoutoutData>) =>
      updateMutation?.mutateAsync ? updateMutation.mutateAsync({ id, data }) : Promise.reject(new Error('Update mutation not ready')),
    delete: (id: string) => {
      return deleteMutation?.mutateAsync ? deleteMutation.mutateAsync(id) : Promise.reject(new Error('Delete mutation not ready'));
    },

    // Individual mutation objects for specific access when needed
    createMutation,
    updateMutation,
    deleteMutation,

    // Raw queries for advanced usage
    shoutoutsQuery,
  };
}

