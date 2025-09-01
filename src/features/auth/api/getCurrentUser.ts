import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { logger } from '@/shared';
import { toCurrentUser } from '@/features/users/transformers/userTransformer';
import type { CurrentUser } from '@/features/users/types';
import { ERROR_CODES } from '@/shared/constants';

/**
 * Gets the current authenticated user from Supabase auth
 * Returns just the authentication state (no profile data)
 */
export async function getCurrentAuthUser(
  supabase: SupabaseClient<Database>,
): Promise<{
  id: string;
  email: string;
} | null> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      logger.debug('🔐 API: Failed to get authenticated user', { error });
      throw error;
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
    const err = error as Error;
    if (err.name === 'AuthSessionMissingError') {
      // Handle specific AuthSessionMissingError - this is expected when no session exists
      logger.debug('🔐 API: No auth session found');
      return null;
    }

    // For all other errors, log and re-throw
    logger.error('🔐 API: Error fetching current auth user', { error });
    throw error;
  }
}

/**
 * Gets the current user's complete profile (auth + profile data)
 * Returns CurrentUser with private fields (email, location)
 */
export async function getCurrentUser(
  supabase: SupabaseClient<Database>,
): Promise<CurrentUser | null> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      logger.debug('🔐 API: Failed to get authenticated user', { error });
      throw error;
    }

    if (!user) {
      logger.debug('🔐 API: No authenticated user found');
      return null;
    }

    // Fetch the user's profile data from profiles table (includes private fields)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      if (profileError.code === ERROR_CODES.NOT_FOUND) {
        logger.debug('🔐 API: User profile not found', { id: user.id });
        return null;
      }
      logger.error('🔐 API: Failed to fetch user profile', { id: user.id, error: profileError });
      throw profileError;
    }

    const currentUser = toCurrentUser(profile);

    logger.debug('🔐 API: Successfully fetched current user', {
      id: currentUser.id,
      email: currentUser.email,
    });

    return currentUser;
  } catch (error) {
    const err = error as Error;
    if (err.name === 'AuthSessionMissingError') {
      // Handle specific AuthSessionMissingError - this is expected when no session exists
      logger.debug('🔐 API: No auth session found');
      return null;
    }

    // For all other errors, log and re-throw
    logger.error('🔐 API: Error fetching current user', { error });
    throw error;
  }
}
