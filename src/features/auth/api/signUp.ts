import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { logger } from '@/shared';
import type { Account } from '../types';

/**
 * Signs up a new user
 * Returns Account object (authentication data only)
 */
export async function signUp(
  supabase: SupabaseClient<Database>,
  email: string,
  password: string,
  firstName: string,
  lastName?: string,
  connectionCode?: string,
): Promise<Account> {
  logger.debug('🔐 API: Signing up user', {
    email,
    firstName,
    lastName,
    hasConnectionCode: !!connectionCode,
  });

  try {
    const metadata: Record<string, string | undefined> = {
      first_name: firstName,
      last_name: lastName,
    };

    if (connectionCode) {
      metadata.invitation_code = connectionCode;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
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
}
