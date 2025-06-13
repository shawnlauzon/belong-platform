import { logger } from '@belongnetwork/core';
import { supabase } from '@belongnetwork/core';
import { AuthUser } from '@belongnetwork/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toDomainUser } from './transformers/userTransformers';

// Authentication error message constants
export const AUTH_ERROR_MESSAGES = {
  /** Error thrown when no user data is returned from sign in */
  NO_USER_DATA_SIGN_IN: 'No user data returned from sign in',
  /** Error thrown when no user data is returned from sign up */
  NO_USER_DATA_SIGN_UP: 'No user data returned from sign up',
  /** Error thrown when user must be authenticated for an operation */
  AUTHENTICATION_REQUIRED: 'User must be authenticated to perform this operation',
} as const;

// Data functions (pure async functions)
export async function signIn(
  email: string,
  password: string
): Promise<AuthUser> {
  logger.debug('🔐 API: Signing in user', { email });

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      logger.error('🔐 API: Failed to sign in', { error });
      throw error;
    }

    if (!data.user) {
      throw new Error(AUTH_ERROR_MESSAGES.NO_USER_DATA_SIGN_IN);
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      logger.warn('🔐 API: Could not fetch user profile', { profileError });
    }

    let authUser: AuthUser;
    
    if (profile) {
      // Transform the profile using the pure transformer function
      const domainUser = toDomainUser(profile);
      authUser = {
        ...domainUser,
        email: data.user.email!,
        location: profile.user_metadata?.location,
      };
    } else {
      // Fallback if no profile exists - ensure email is included
      authUser = {
        id: data.user.id,
        email: data.user.email!,
        first_name: data.user.user_metadata?.first_name || '',
        last_name: data.user.user_metadata?.last_name || '',
        full_name: data.user.user_metadata?.full_name || '',
        avatar_url: data.user.user_metadata?.avatar_url,
        location: data.user.user_metadata?.location,
        created_at: new Date(data.user.created_at!),
        updated_at: new Date(data.user.updated_at!),
      };
    }

    logger.info('🔐 API: Successfully signed in', { userId: authUser.id });
    return authUser;
  } catch (error) {
    logger.error('🔐 API: Error signing in', { error });
    throw error;
  }
}

export async function signUp(
  email: string,
  password: string,
  metadata?: { firstName?: string; lastName?: string }
): Promise<AuthUser> {
  logger.debug('🔐 API: Signing up user', { email });

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: metadata?.firstName || '',
          last_name: metadata?.lastName || '',
          full_name:
            `${metadata?.firstName || ''} ${metadata?.lastName || ''}`.trim(),
        },
      },
    });

    if (error) {
      logger.error('🔐 API: Failed to sign up', { error });
      throw error;
    }

    if (!data.user) {
      throw new Error(AUTH_ERROR_MESSAGES.NO_USER_DATA_SIGN_UP);
    }

    const authUser: AuthUser = {
      id: data.user.id,
      email: data.user.email!,
      first_name: metadata?.firstName || '',
      last_name: metadata?.lastName || '',
      full_name:
        `${metadata?.firstName || ''} ${metadata?.lastName || ''}`.trim(),
      avatar_url: undefined,
      location: undefined,
      created_at: new Date(data.user.created_at!),
      updated_at: new Date(data.user.updated_at!),
    };

    logger.info('🔐 API: Successfully signed up', { userId: authUser.id });
    return authUser;
  } catch (error) {
    logger.error('🔐 API: Error signing up', { error });
    throw error;
  }
}

export async function signOut(): Promise<void> {
  logger.debug('🔐 API: Signing out user');

  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      logger.error('🔐 API: Failed to sign out', { error });
      throw error;
    }

    logger.info('🔐 API: Successfully signed out');
  } catch (error) {
    logger.error('🔐 API: Error signing out', { error });
    throw error;
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      logger.error('🔐 API: Failed to get current user', { error });
      return null;
    }

    if (!user) {
      return null;
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      logger.warn('🔐 API: Could not fetch user profile', { profileError });
    }

    let authUser: AuthUser;
    
    if (profile) {
      // Transform the profile using the pure transformer function
      const domainUser = toDomainUser(profile);
      authUser = {
        ...domainUser,
        email: user.email!,
        location: profile.user_metadata?.location,
      };
    } else {
      // Fallback if no profile exists
      authUser = {
        id: user.id,
        email: user.email!,
        first_name: user.user_metadata?.first_name || '',
        last_name: user.user_metadata?.last_name || '',
        full_name: user.user_metadata?.full_name || '',
        avatar_url: user.user_metadata?.avatar_url,
        location: user.user_metadata?.location,
        created_at: new Date(user.created_at!),
        updated_at: new Date(user.updated_at!),
      };
    }

    return authUser;
  } catch (error) {
    logger.error('🔐 API: Error getting current user', { error });
    return null;
  }
}

// React Query hooks
export function useCurrentUser() {
  return useQuery({
    queryKey: ['auth', 'currentUser'],
    queryFn: getCurrentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}

export function useSignIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      signIn(email, password),
    onSuccess: (user) => {
      // Update current user in cache
      queryClient.setQueryData(['auth', 'currentUser'], user);

      logger.info('🔐 API: User signed in successfully', { userId: user.id });
    },
    onError: (error) => {
      logger.error('🔐 API: Failed to sign in', { error });
    },
  });
}

export function useSignUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      email,
      password,
      metadata,
    }: {
      email: string;
      password: string;
      metadata?: { firstName?: string; lastName?: string };
    }) => signUp(email, password, metadata),
    onSuccess: (user) => {
      // Update current user in cache
      queryClient.setQueryData(['auth', 'currentUser'], user);

      logger.info('🔐 API: User signed up successfully', { userId: user.id });
    },
    onError: (error) => {
      logger.error('🔐 API: Failed to sign up', { error });
    },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: signOut,
    onSuccess: () => {
      // Clear all cached data
      queryClient.clear();

      logger.info('🔐 API: User signed out successfully');
    },
    onError: (error) => {
      logger.error('🔐 API: Failed to sign out', { error });
    },
  });
}