import { logger } from '@belongnetwork/core';
import { Account, User } from '@belongnetwork/types';
import { createUserService } from '../../users/services/user.service';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@belongnetwork/types/database';

/**
 * Service layer for authentication operations
 * This handles pure auth operations without caching concerns
 */

/**
 * Creates auth service with the provided supabase client
 * This pattern allows for dependency injection while keeping services pure
 */
export const createAuthService = (supabase: SupabaseClient<Database>) => ({
  /**
   * Signs in a user with email and password
   * Returns Account object (authentication data only)
   */
  async signIn(email: string, password: string): Promise<Account> {
  
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
      throw new Error('No user data returned from sign in');
    }

    // Return Account object (auth data only)
    const account: Account = {
      id: data.user.id,
      email: data.user.email!,
      firstName: data.user.user_metadata?.first_name || '',
      lastName: data.user.user_metadata?.last_name,
      fullName: data.user.user_metadata?.full_name,
      avatarUrl: data.user.user_metadata?.avatar_url,
      location: data.user.user_metadata?.location,
      createdAt: new Date(data.user.created_at!),
      updatedAt: new Date(data.user.updated_at!),
    };

    logger.info('🔐 API: Successfully signed in', { userId: account.id });
    return account;
  } catch (error) {
    logger.error('🔐 API: Error signing in', { error });
    throw error;
  }
  },

  /**
   * Signs up a new user
   * Returns Account object (authentication data only)
   */
  async signUp(
    email: string,
    password: string,
    firstName: string,
    lastName?: string
  ): Promise<Account> {
  
  logger.debug('🔐 API: Signing up user', { email, firstName, lastName });

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });

    if (error) {
      logger.error('🔐 API: Failed to sign up', { error });
      throw error;
    }

    if (!data.user) {
      throw new Error('No user data returned from sign up');
    }

    const account: Account = {
      id: data.user.id,
      email: data.user.email!,
      firstName: data.user.user_metadata?.first_name || firstName,
      lastName: data.user.user_metadata?.last_name || lastName,
      fullName: data.user.user_metadata?.full_name,
      avatarUrl: data.user.user_metadata?.avatar_url,
      location: data.user.user_metadata?.location,
      createdAt: new Date(data.user.created_at!),
      updatedAt: new Date(data.user.updated_at!),
    };

    logger.info('🔐 API: Successfully signed up', { userId: account.id });
    return account;
  } catch (error) {
    logger.error('🔐 API: Error signing up', { error });
    throw error;
  }
  },

  /**
   * Signs out the current user
   */
  async signOut(): Promise<void> {
  
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
  },

  /**
   * Gets the current authenticated user from Supabase auth
   * Returns just the authentication state (no profile data)
   */
  async getCurrentAuthUser(): Promise<{ id: string; email: string } | null> {
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      logger.debug('🔐 API: Failed to get authenticated user', { error });
      return null;
    }
    
    if (!user) {
      logger.debug('🔐 API: No authenticated user found');
      return null;
    }
    
    return {
      id: user.id,
      email: user.email!,
    };
  } catch (error) {
    logger.error('🔐 API: Error fetching current auth user', { error });
    return null;
  }
  },

  /**
   * Gets the current user's complete profile (auth + profile data)
   * Combines auth state with user profile data
   */
  async getCurrentUser(): Promise<User | null> {
    const authUser = await this.getCurrentAuthUser();
    
    if (!authUser) {
      return null;
    }
    
    // Use user service to get profile data
    const userService = createUserService(supabase);
    return userService.fetchUserById(authUser.id);
  }
});