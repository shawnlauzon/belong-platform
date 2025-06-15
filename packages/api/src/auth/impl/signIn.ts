import { logger } from '@belongnetwork/core';
import { supabase } from '@belongnetwork/core';
import { AuthUser } from '@belongnetwork/types';
import { toDomainUser } from '../../transformers/userTransformer';

/**
 * Signs in a user with the provided email and password
 * @param email - The user's email address
 * @param password - The user's password
 * @returns A promise that resolves to the authenticated user
 * @throws {Error} If sign in fails or no user data is returned
 */
export async function signIn(email: string, password: string): Promise<AuthUser> {
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

export default signIn;
