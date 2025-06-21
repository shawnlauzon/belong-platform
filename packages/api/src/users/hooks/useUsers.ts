import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
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
export function useUsers(filter: UserFilter = {}) {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const userService = createUserService(supabase);

  // List users query
  const usersQuery = useQuery({
    queryKey:
      filter && Object.keys(filter).length > 0
        ? ["users", "filtered", filter]
        : queryKeys.users.all,
    queryFn: () => userService.fetchUsers(filter),
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: keepPreviousData,
  });

  // Query factory function
  const getUser = (id: string) => {
    return useQuery<User | null, Error>({
      queryKey: queryKeys.users.byId(id),
      queryFn: () => userService.fetchUserById(id),
      enabled: !!id,
      staleTime: 5 * 60 * 1000,
    });
  };

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (user: User) => userService.updateUser(user),
    onSuccess: (updatedUser) => {
      // Update the cache for this specific user
      queryClient.setQueryData(
        queryKeys.users.byId(updatedUser.id),
        updatedUser,
      );

      // Invalidate users list to refresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });

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

      // Invalidate users list to refresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });

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
    // Queries
    users: usersQuery.data,
    isLoading: usersQuery.isLoading,
    error: usersQuery.error,
    getUser,

    // Mutations
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,

    // Mutation states
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,

    // Raw queries for advanced usage
    usersQuery,
  };
}
