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
export function useThanks(filters?: ThanksFilter) {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const thanksService = createThanksService(supabase);

  // List thanks query
  const thanksQuery = useQuery<ThanksInfo[], Error>({
    queryKey: filters
      ? queryKeys.thanks.filtered(filters)
      : queryKeys.thanks.all,
    queryFn: () => thanksService.fetchThanks(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Note: Individual query hooks should be called separately by consumers
  // These factory functions violated Rules of Hooks and have been removed

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: ThanksData) => thanksService.createThanks(data),
    onSuccess: (newThanks) => {
      // Invalidate the thanks list to reflect the new thanks
      queryClient.invalidateQueries({ queryKey: queryKeys.thanks.all });

      // Invalidate filtered queries that might include this thanks
      if (newThanks.fromUser?.id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.thanks.sentBy(newThanks.fromUser.id),
        });
      }
      if (newThanks.toUser?.id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.thanks.receivedBy(newThanks.toUser.id),
        });
      }
      if (newThanks.resource?.community?.id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.thanks.byCommunity(
            newThanks.resource.community.id,
          ),
        });
      }

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
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.thanks.all });

      // Invalidate filtered queries
      if (updatedThanks.fromUser?.id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.thanks.sentBy(updatedThanks.fromUser.id),
        });
      }
      if (updatedThanks.toUser?.id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.thanks.receivedBy(updatedThanks.toUser.id),
        });
      }
      if (updatedThanks.resource?.community?.id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.thanks.byCommunity(
            updatedThanks.resource.community.id,
          ),
        });
      }

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
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.thanks.all });
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
      filters,
    });
  }

  return {
    // Queries
    thanks: thanksQuery.data,
    isLoading: thanksQuery.isLoading,
    error: thanksQuery.error,

    // Mutations (with defensive null checks for testing environments)
    create: createMutation?.mutateAsync || (() => Promise.reject(new Error('Create mutation not ready'))),
    update: (id: string, data: Partial<ThanksData>) =>
      updateMutation?.mutateAsync ? updateMutation.mutateAsync({ id, data }) : Promise.reject(new Error('Update mutation not ready')),
    delete: deleteMutation?.mutateAsync || (() => Promise.reject(new Error('Delete mutation not ready'))),

    // Mutation states (with defensive null checks)
    isCreating: createMutation?.isPending || false,
    isUpdating: updateMutation?.isPending || false,
    isDeleting: deleteMutation?.isPending || false,

    // Raw queries for advanced usage
    thanksQuery,
  };
}

/**
 * Hook to fetch a specific thanks by ID
 */
export function useThank(id: string) {
  const supabase = useSupabase();
  const thanksService = createThanksService(supabase);
  
  return useQuery<Thanks | null, Error>({
    queryKey: queryKeys.thanks.byId(id),
    queryFn: () => thanksService.fetchThanksById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}
