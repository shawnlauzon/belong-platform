import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { logger } from '@/shared';
import type { Account } from '../types';

/**
 * Signs in a user with email and password
 * Returns Account object (authentication data only)
 */
export async function signIn(
  supabase: SupabaseClient<Database>,
  email: string,
  password: string,
): Promise<Account> {
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
      firstName: data.user.user_metadata?.first_name,
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
}