import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { logger } from "@belongnetwork/core";
import { useSupabase } from "../../auth/providers/CurrentUserProvider";
import { createThanksService } from "../services/thanks.service";
import { queryKeys } from "../../shared/queryKeys";
import type {
  Thanks,
  ThanksInfo,
  ThanksData,
  ThanksFilter,
} from "@belongnetwork/types";

/**
 * Consolidated hook for all thanks operations
 * Provides queries, mutations, and state management for thanks
 */
export function useThanks() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const thanksService = createThanksService(supabase);

  // List thanks query - disabled by default to prevent automatic fetching
  const thanksQuery = useQuery<ThanksInfo[], Error>({
    queryKey: queryKeys.thanks.all,
    queryFn: () => thanksService.fetchThanks(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: false, // Prevent automatic fetching
  });

  // Note: Individual query hooks should be called separately by consumers
  // These factory functions violated Rules of Hooks and have been removed

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: ThanksData) => thanksService.createThanks(data),
    onSuccess: (newThanks) => {
      // Invalidate all thanks queries
      queryClient.invalidateQueries({ queryKey: ["thanks"] });

      // Update the cache for this specific thanks
      queryClient.setQueryData(queryKeys.thanks.byId(newThanks.id), newThanks);

      logger.info("🙏 API: Successfully created thanks via consolidated hook", {
        id: newThanks.id,
        message: newThanks.message,
        fromUserId: newThanks.fromUser?.id,
        toUserId: newThanks.toUser?.id,
      });
    },
    onError: (error) => {
      logger.error("🙏 API: Failed to create thanks via consolidated hook", {
        error,
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ThanksData> }) =>
      thanksService.updateThanks(id, data),
    onSuccess: (updatedThanks) => {
      // Invalidate all thanks queries
      queryClient.invalidateQueries({ queryKey: ["thanks"] });

      // Update the cache for this specific thanks
      queryClient.setQueryData(
        queryKeys.thanks.byId(updatedThanks.id),
        updatedThanks,
      );

      logger.info("🙏 API: Successfully updated thanks via consolidated hook", {
        id: updatedThanks.id,
        message: updatedThanks.message,
      });
    },
    onError: (error) => {
      logger.error("🙏 API: Failed to update thanks via consolidated hook", {
        error,
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => thanksService.deleteThanks(id),
    onSuccess: (_, thanksId) => {
      // Invalidate all thanks queries
      queryClient.invalidateQueries({ queryKey: ["thanks"] });
      queryClient.removeQueries({
        queryKey: queryKeys.thanks.byId(thanksId),
      });

      logger.info("🙏 API: Successfully deleted thanks via consolidated hook", {
        id: thanksId,
      });
    },
    onError: (error) => {
      logger.error("🙏 API: Failed to delete thanks via consolidated hook", {
        error,
      });
    },
  });

  // Handle list query errors
  if (thanksQuery.error) {
    logger.error("🙏 API: Error fetching thanks via consolidated hook", {
      error: thanksQuery.error,
    });
  }

  return {
    // Unified React Query status properties (query + mutations)
    // Note: For disabled queries, we only consider them pending if they're actually fetching
    isPending: thanksQuery.isFetching || 
               (createMutation && createMutation.isPending) || 
               (updateMutation && updateMutation.isPending) || 
               (deleteMutation && deleteMutation.isPending) || 
               false,
    isError: thanksQuery.isError || (createMutation?.isError || false) || (updateMutation?.isError || false) || (deleteMutation?.isError || false),
    isSuccess: thanksQuery.isSuccess || (createMutation?.isSuccess || false) || (updateMutation?.isSuccess || false) || (deleteMutation?.isSuccess || false),
    isFetching: thanksQuery.isFetching, // Only for query operations
    error: thanksQuery.error || createMutation?.error || updateMutation?.error || deleteMutation?.error,

    // List fetch operation
    list: async (filters?: ThanksFilter) => {
      const result = await queryClient.fetchQuery({
        queryKey: filters
          ? queryKeys.thanks.filtered(filters)
          : queryKeys.thanks.all,
        queryFn: () => thanksService.fetchThanks(filters),
        staleTime: 5 * 60 * 1000,
      });
      return result;
    },

    // Individual item fetch operation
    byId: async (id: string) => {
      const result = await queryClient.fetchQuery({
        queryKey: queryKeys.thanks.byId(id),
        queryFn: () => thanksService.fetchThanksById(id),
        staleTime: 5 * 60 * 1000,
      });
      return result;
    },

    // Mutations (with defensive null checks for testing environments)
    create: createMutation?.mutateAsync || (() => Promise.reject(new Error('Create mutation not ready'))),
    update: (id: string, data: Partial<ThanksData>) =>
      updateMutation?.mutateAsync ? updateMutation.mutateAsync({ id, data }) : Promise.reject(new Error('Update mutation not ready')),
    delete: deleteMutation?.mutateAsync || (() => Promise.reject(new Error('Delete mutation not ready'))),

    // Individual mutation objects for specific access when needed
    createMutation,
    updateMutation,
    deleteMutation,

    // Raw queries for advanced usage
    thanksQuery,
  };
}

