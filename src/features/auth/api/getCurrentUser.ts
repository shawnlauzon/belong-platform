import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { logger } from '@/shared';
import { toCurrentUser } from '@/features/users/transformers/userTransformer';
import type { CurrentUser } from '@/features/users/types';
import { ERROR_CODES } from '@/shared/constants';

/**
 * Gets the current user's complete profile (auth + profile data)
 * Returns CurrentUser with private fields (email, location)
 */
export async function getCurrentUserOrFail(
  supabase: SupabaseClient<Database>,
): Promise<CurrentUser> {
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
      throw new Error('No authenticated user found');
    }

    // Fetch the user's profile data from profiles table (includes private fields)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      if (profileError.code === ERROR_CODES.NOT_FOUND) {
        throw new Error('User profile not found');
      }
      logger.error('🔐 API: Failed to fetch user profile', {
        id: user.id,
        error: profileError,
      });
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
    throw err;
  }
}
