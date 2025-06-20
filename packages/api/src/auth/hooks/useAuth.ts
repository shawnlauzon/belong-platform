import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User } from '@belongnetwork/types';
import { logger } from '@belongnetwork/core';
import { queryKeys } from '../../shared/queryKeys';
import { 
  signIn as signInService, 
  signUp as signUpService, 
  signOut as signOutService,
  getCurrentAuthUser,
  getCurrentUser,
} from '../services/auth.service';
import { updateUser } from '../../users/impl/updateUser';

/**
 * Unified authentication hook that provides both queries and mutations
 * This is the core hook that manages auth state and user data
 */
export function useAuth() {
  const queryClient = useQueryClient();

  // Query for authentication state (just auth info, no profile)
  const authQuery = useQuery({
    queryKey: queryKeys.auth,
    queryFn: getCurrentAuthUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (error?.message?.includes('Invalid Refresh Token') || 
          error?.message?.includes('Auth session missing')) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Query for current user profile data (if authenticated)
  const currentUserQuery = useQuery({
    queryKey: authQuery.data ? queryKeys.users.byId(authQuery.data.id) : ['user', 'null'],
    queryFn: () => getCurrentUser(),
    enabled: !!authQuery.data, // Only run if authenticated
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (error?.message?.includes('Invalid Refresh Token') || 
          error?.message?.includes('Auth session missing')) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Sign in mutation
  const signInMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      signInService(email, password),
    onSuccess: (account) => {
      logger.info('🔐 API: User signed in successfully', { userId: account.id });
      
      // Invalidate auth state to refetch with new session
      queryClient.invalidateQueries({ queryKey: queryKeys.auth });
      
      // Invalidate user profile data for the new user
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.users.byId(account.id) 
      });
    },
    onError: (error) => {
      logger.error('🔐 API: Failed to sign in', { error });
    },
  });

  // Sign up mutation
  const signUpMutation = useMutation({
    mutationFn: ({ 
      email, 
      password, 
      firstName, 
      lastName 
    }: { 
      email: string; 
      password: string; 
      firstName: string; 
      lastName?: string;
    }) => signUpService(email, password, firstName, lastName),
    onSuccess: (account) => {
      logger.info('🔐 API: User signed up successfully', { userId: account.id });
      
      // Invalidate auth state to refetch with new session
      queryClient.invalidateQueries({ queryKey: queryKeys.auth });
      
      // Invalidate user profile data for the new user
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.users.byId(account.id) 
      });
    },
    onError: (error) => {
      logger.error('🔐 API: Failed to sign up', { error });
    },
  });

  // Sign out mutation
  const signOutMutation = useMutation({
    mutationFn: signOutService,
    onSuccess: () => {
      const currentUserId = authQuery.data?.id;
      
      logger.info('🔐 API: User signed out successfully');
      
      // Remove auth state
      queryClient.removeQueries({ queryKey: queryKeys.auth });
      
      // Remove current user profile data
      if (currentUserId) {
        queryClient.removeQueries({ 
          queryKey: queryKeys.users.byId(currentUserId) 
        });
      }
    },
    onError: (error) => {
      logger.error('🔐 API: Failed to sign out', { error });
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (updates: Partial<User>) => {
      if (!authQuery.data?.id) {
        throw new Error('No authenticated user to update');
      }
      return updateUser({ 
        id: authQuery.data.id, 
        ...updates 
      });
    },
    onSuccess: (updatedUser) => {
      logger.info('🔐 API: Profile updated successfully', { userId: updatedUser.id });
      
      // Update the user cache with new data
      queryClient.setQueryData(
        queryKeys.users.byId(updatedUser.id),
        updatedUser
      );
    },
    onError: (error) => {
      logger.error('🔐 API: Failed to update profile', { error });
    },
  });

  return {
    // Auth state
    authUser: authQuery.data,
    isAuthenticated: !!authQuery.data,
    isAuthLoading: authQuery.isPending,
    authError: authQuery.error,

    // Current user profile data
    currentUser: currentUserQuery.data,
    isUserLoading: currentUserQuery.isPending,
    userError: currentUserQuery.error,

    // Combined loading state - only include currentUserQuery.isPending if user is authenticated
    isPending: authQuery.isPending || (!!authQuery.data && currentUserQuery.isPending),
    isError: authQuery.isError || currentUserQuery.isError,
    error: authQuery.error || currentUserQuery.error,

    // Mutations
    signIn: signInMutation,
    signUp: signUpMutation,
    signOut: signOutMutation,
    updateProfile: updateProfileMutation,

    // Raw queries for advanced usage
    authQuery,
    currentUserQuery,
  };
}