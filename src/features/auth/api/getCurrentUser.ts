import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { logger } from '@/shared';
import { fetchUserById } from '@/features/users/api';
import type { User } from '@/features/users/types';

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
}

/**
 * Gets the current user's complete profile (auth + profile data)
 * Combines auth state with user profile data
 */
export async function getCurrentUser(
  supabase: SupabaseClient<Database>,
): Promise<User | null> {
  const authUser = await getCurrentAuthUser(supabase);

  if (!authUser) {
    return null;
  }

  // Use fetch function to get profile data
  return fetchUserById(supabase, authUser.id);
}