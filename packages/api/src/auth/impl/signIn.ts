import { logger } from '@belongnetwork/core';
import { Account } from '@belongnetwork/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@belongnetwork/types/database';

/**
 * Signs in a user with the provided email and password
 * @param email - The user's email address
 * @param password - The user's password
 * @param supabase - The supabase client instance
 * @returns A promise that resolves to the authenticated user
 * @throws {Error} If sign in fails or no user data is returned
 */
export async function signIn(email: string, password: string, supabase?: SupabaseClient<Database>): Promise<Account> {
  if (!supabase) {
    throw new Error('signIn requires a supabase client. Use the hook pattern instead.');
  }
  
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
        firstName: (metadata?.first_name as string) || '',
        lastName: metadata?.last_name as string | undefined,
        fullName: metadata?.full_name as string | undefined,
        avatarUrl: metadata?.avatar_url as string | undefined,
        location: data.user.user_metadata?.location,
        createdAt: new Date(profile.created_at),
        updatedAt: new Date(profile.updated_at),
      };
    } else {
      // Fallback if no profile exists - ensure email is included
      account = {
        id: data.user.id,
        email: data.user.email!,
        firstName: data.user.user_metadata?.first_name || '',
        lastName: data.user.user_metadata?.last_name || '',
        fullName: data.user.user_metadata?.full_name || '',
        avatarUrl: data.user.user_metadata?.avatar_url,
        location: data.user.user_metadata?.location,
        createdAt: new Date(data.user.created_at!),
        updatedAt: new Date(data.user.updated_at!),
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
