import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { logger } from "@belongnetwork/core";
import { useSupabase } from "../../auth/providers/CurrentUserProvider";
import { createUserService } from "../services/user.service";
import { queryKeys, STANDARD_CACHE_TIME } from "../../shared";
import type { User, UserInfo, UserFilter } from "@belongnetwork/types";

/**
 * Comprehensive hook for user operations including fetching, updating, and user management.
 * 
 * This hook provides functionality for managing user profiles, searching users,
 * and updating user information within communities. Must be used within 
 * a BelongProvider context.
 * 
 * @returns User queries, mutations, and utility functions
 * 
 * @example
 * ```tsx
 * function UserDirectory() {
 *   const { 
 *     fetchUsers, 
 *     updateUser, 
 *     usersQuery 
 *   } = useUsers();
 * 
 *   // Load users manually
 *   const handleLoad = () => {
 *     fetchUsers();
 *   };
 * 
 *   // Update user profile
 *   const handleUpdate = async (userId, updates) => {
 *     try {
 *       const user = await updateUser.mutateAsync({
 *         id: userId,
 *         ...updates
 *       });
 *       console.log('Updated user:', user.fullName);
 *     } catch (error) {
 *       console.error('Failed to update user:', error);
 *     }
 *   };
 * 
 *   return (
 *     <div>
 *       <button onClick={handleLoad}>Load Users</button>
 *       {usersQuery.data?.map(user => (
 *         <div key={user.id}>
 *           {user.fullName}
 *           <button onClick={() => handleUpdate(user.id, { firstName: 'Updated' })}>
 *             Update
 *           </button>
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 * 
 * @category React Hooks
 */
export function useUsers() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const userService = createUserService(supabase);

  // List users query - disabled by default to prevent automatic fetching
  const usersQuery = useQuery<UserInfo[], Error>({
    queryKey: queryKeys.users.all,
    queryFn: () => userService.fetchUsers(),
    staleTime: STANDARD_CACHE_TIME,
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
      const result = await queryClient.fetchQuery<UserInfo[]>({
        queryKey: filters && Object.keys(filters).length > 0
          ? ["users", "filtered", filters]
          : queryKeys.users.all,
        queryFn: () => userService.fetchUsers(filters),
        staleTime: STANDARD_CACHE_TIME,
      });
      return result;
    },

    // Individual item fetch operation
    byId: async (id: string) => {
      const result = await queryClient.fetchQuery({
        queryKey: queryKeys.users.byId(id),
        queryFn: () => userService.fetchUserById(id),
        staleTime: STANDARD_CACHE_TIME,
      });
      return result;
    },

    // Mutations - type-safe wrapper functions to prevent parameter misuse
    update: (user: User) => {
      return updateMutation?.mutateAsync ? updateMutation.mutateAsync(user) : Promise.reject(new Error('Update mutation not ready'));
    },
    delete: (id: string) => {
      return deleteMutation?.mutateAsync ? deleteMutation.mutateAsync(id) : Promise.reject(new Error('Delete mutation not ready'));
    },

    // Individual mutation objects for specific access when needed
    updateMutation,
    deleteMutation,

    // Raw queries for advanced usage
    usersQuery,
  };
}

