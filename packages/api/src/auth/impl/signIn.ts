import { getBelongClient } from '@belongnetwork/core';
import { Account } from '@belongnetwork/types';

/**
 * Signs in a user with the provided email and password
 * @param email - The user's email address
 * @param password - The user's password
 * @returns A promise that resolves to the authenticated user
 * @throws {Error} If sign in fails or no user data is returned
 */
export async function signIn(email: string, password: string): Promise<Account> {
  const { supabase, logger } = getBelongClient();
  
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

    let account: Account;

    if (profile) {
      // Extract fields directly from profile to create Account format
      const metadata = profile.user_metadata as Record<string, unknown>;
      account = {
        id: profile.id,
        email: data.user.email!,
        first_name: (metadata?.first_name as string) || '',
        last_name: metadata?.last_name as string | undefined,
        full_name: metadata?.full_name as string | undefined,
        avatar_url: metadata?.avatar_url as string | undefined,
        location: data.user.user_metadata?.location,
        created_at: new Date(profile.created_at),
        updated_at: new Date(profile.updated_at),
      };
    } else {
      // Fallback if no profile exists - ensure email is included
      account = {
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

    logger.info('🔐 API: Successfully signed in', { userId: account.id });
    return account;
  } catch (error) {
    logger.error('🔐 API: Error signing in', { error });
    throw error;
  }
}

export default signIn;
