import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User } from "@belongnetwork/types";
import { queryKeys } from "../../shared/queryKeys";
import { createAuthService } from "../services/auth.service";
import { createUserService } from "../../users/services/user.service";
import { useSupabase } from "../providers/CurrentUserProvider";
import { logger } from "@belongnetwork/core";

/**
 * Main authentication hook for consumers
 * Provides simplified interface matching architecture document
 */
export function useAuth() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const authService = createAuthService(supabase);

  // Query for current user (combines auth + profile data)
  const currentUserQuery = useQuery({
    queryKey: ["auth"],
    queryFn: authService.getCurrentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (
        error?.message?.includes("Invalid Refresh Token") ||
        error?.message?.includes("Auth session missing")
      ) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Sign in mutation
  const signInMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authService.signIn(email, password),
    onSuccess: (account) => {
      logger.info("🔐 API: User signed in successfully", {
        userId: account.id,
      });

      // Invalidate auth state to refetch with new session
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      queryClient.invalidateQueries({ queryKey: ["user", account.id] });
    },
    onError: (error) => {
      logger.error("🔐 API: Failed to sign in", { error });
    },
  });

  // Sign up mutation
  const signUpMutation = useMutation({
    mutationFn: ({
      email,
      password,
      firstName,
      lastName,
    }: {
      email: string;
      password: string;
      firstName: string;
      lastName?: string;
    }) => authService.signUp(email, password, firstName, lastName),
    onSuccess: (account) => {
      logger.info("🔐 API: User signed up successfully", {
        userId: account.id,
      });

      // Invalidate auth state to refetch with new session
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      queryClient.invalidateQueries({ queryKey: ["user", account.id] });
    },
    onError: (error) => {
      logger.error("🔐 API: Failed to sign up", { error });
    },
  });

  // Sign out mutation
  const signOutMutation = useMutation({
    mutationFn: authService.signOut,
    onSuccess: () => {
      logger.info("🔐 API: User signed out successfully");

      // Remove auth state and user data
      queryClient.removeQueries({ queryKey: ["auth"] });
      queryClient.removeQueries({ queryKey: ["users"] });
    },
    onError: (error) => {
      logger.error("🔐 API: Failed to sign out", { error });
    },
  });

  // Update profile mutation
  const userService = createUserService(supabase);
  const updateProfileMutation = useMutation({
    mutationFn: (updates: Partial<User>) => {
      if (!currentUserQuery.data?.id) {
        throw new Error("No authenticated user to update");
      }
      return userService.updateUser({
        id: currentUserQuery.data.id,
        ...updates,
      });
    },
    onSuccess: (updatedUser) => {
      logger.info("🔐 API: Profile updated successfully", {
        userId: updatedUser.id,
      });

      // Update the user cache with new data
      queryClient.setQueryData(["user", updatedUser.id], updatedUser);
      queryClient.invalidateQueries({ queryKey: ["auth"] });
    },
    onError: (error) => {
      logger.error("🔐 API: Failed to update profile", { error });
    },
  });

  // Return simplified interface matching architecture document
  return {
    // Current user data
    currentUser: currentUserQuery.data || null,
    isAuthenticated: !!currentUserQuery.data,
    isPending: currentUserQuery.isPending,
    isError: currentUserQuery.isError,
    error: currentUserQuery.error,

    // Auth mutations - return mutation functions directly for cleaner API
    signIn: signInMutation.mutateAsync,
    signUp: signUpMutation.mutateAsync,
    signOut: signOutMutation.mutateAsync,
    updateProfile: updateProfileMutation.mutateAsync,
  };
}
