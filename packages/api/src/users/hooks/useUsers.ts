import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { logger } from "@belongnetwork/core";
import { useSupabase } from "../../auth/providers/CurrentUserProvider";
import { createUserService } from "../services/user.service";
import { queryKeys } from "../../shared/queryKeys";
import type { User, UserFilter } from "@belongnetwork/types";

/**
 * Consolidated hook for all user operations
 * Provides queries, mutations, and state management for users
 */
export function useUsers() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const userService = createUserService(supabase);

  // List users query - disabled by default to prevent automatic fetching
  const usersQuery = useQuery<User[], Error>({
    queryKey: queryKeys.users.all,
    queryFn: () => userService.fetchUsers(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: false, // Prevent automatic fetching
  });

  // Note: Individual query hooks should be called separately by consumers
  // These factory functions violated Rules of Hooks and have been removed

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (user: User) => userService.updateUser(user),
    onSuccess: (updatedUser) => {
      // Update the cache for this specific user
      queryClient.setQueryData(
        queryKeys.users.byId(updatedUser.id),
        updatedUser,
      );

      // Invalidate all users queries
      queryClient.invalidateQueries({ queryKey: ["users"] });

      logger.info("👤 API: Successfully updated user via consolidated hook", {
        id: updatedUser.id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
      });
    },
    onError: (error) => {
      logger.error("👤 API: Failed to update user via consolidated hook", {
        error,
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => userService.deleteUser(id),
    onSuccess: (_, userId) => {
      // Remove user from cache
      queryClient.removeQueries({
        queryKey: queryKeys.users.byId(userId),
      });

      // Invalidate all users queries
      queryClient.invalidateQueries({ queryKey: ["users"] });

      logger.info("👤 API: Successfully deleted user via consolidated hook", {
        id: userId,
      });
    },
    onError: (error) => {
      logger.error("👤 API: Failed to delete user via consolidated hook", {
        error,
      });
    },
  });

  return {
    // Unified React Query status properties (query + mutations)
    isPending: usersQuery.isFetching || 
               (updateMutation && updateMutation.isPending) || 
               (deleteMutation && deleteMutation.isPending) || 
               false,
    isError: usersQuery.isError || (updateMutation?.isError || false) || (deleteMutation?.isError || false),
    isSuccess: usersQuery.isSuccess || (updateMutation?.isSuccess || false) || (deleteMutation?.isSuccess || false),
    isFetching: usersQuery.isFetching, // Only for query operations
    error: usersQuery.error || updateMutation?.error || deleteMutation?.error,

    // List fetch operation
    list: async (filters?: UserFilter) => {
      const result = await queryClient.fetchQuery({
        queryKey: filters && Object.keys(filters).length > 0
          ? ["users", "filtered", filters]
          : queryKeys.users.all,
        queryFn: () => userService.fetchUsers(filters),
        staleTime: 5 * 60 * 1000,
      });
      return result;
    },

    // Individual item fetch operation
    byId: async (id: string) => {
      const result = await queryClient.fetchQuery({
        queryKey: queryKeys.users.byId(id),
        queryFn: () => userService.fetchUserById(id),
        staleTime: 5 * 60 * 1000,
      });
      return result;
    },

    // Mutations (with defensive null checks for testing environments)
    update: updateMutation?.mutateAsync || (() => Promise.reject(new Error('Update mutation not ready'))),
    delete: deleteMutation?.mutateAsync || (() => Promise.reject(new Error('Delete mutation not ready'))),

    // Individual mutation objects for specific access when needed
    updateMutation,
    deleteMutation,

    // Raw queries for advanced usage
    usersQuery,
  };
}

