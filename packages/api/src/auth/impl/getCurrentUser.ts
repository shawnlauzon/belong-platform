import { logger } from '@belongnetwork/core';
import { supabase } from '@belongnetwork/core';
import { AuthUser } from '@belongnetwork/types';
import { toDomainUser } from '../../transformers/userTransformer';

/**
 * Gets the currently authenticated user
 * @returns A promise that resolves to the current user, or null if not authenticated
 * @throws {Error} If there's an error fetching the current user
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  logger.debug('🔐 API: Getting current user');

  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      logger.error('🔐 API: Failed to get current user', { error });
      throw error;
    }

    if (!user) {
      logger.debug('🔐 API: No authenticated user found');
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
      // Fallback if no profile exists - ensure email is included
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

    logger.debug('🔐 API: Successfully retrieved current user', { userId: authUser.id });
    return authUser;
  } catch (error) {
    logger.error('🔐 API: Error getting current user', { error });
    throw error;
  }
}

export default getCurrentUser;
