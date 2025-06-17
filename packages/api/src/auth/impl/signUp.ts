import { getBelongClient } from '@belongnetwork/core';
import { Account } from '@belongnetwork/types';

/**
 * Signs up a new user with the provided email, password, and optional metadata
 * @param email - The user's email address
 * @param password - The user's password
 * @param metadata - Optional user metadata (first name, last name)
 * @returns A promise that resolves to the newly created user
 * @throws {Error} If sign up fails or no user data is returned
 */
export async function signUp(
  email: string,
  password: string,
  metadata?: { firstName?: string; lastName?: string }
): Promise<Account> {
  const { supabase, logger } = getBelongClient();
  
  logger.debug('🔐 API: Signing up user', { email });

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: metadata?.firstName || '',
          last_name: metadata?.lastName || '',
          full_name: `${metadata?.firstName || ''} ${metadata?.lastName || ''}`.trim(),
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
      first_name: data.user.user_metadata?.first_name || '',
      last_name: data.user.user_metadata?.last_name || '',
      full_name: data.user.user_metadata?.full_name || '',
      avatar_url: data.user.user_metadata?.avatar_url,
      location: data.user.user_metadata?.location,
      created_at: new Date(data.user.created_at!),
      updated_at: new Date(data.user.updated_at!),
    };

    logger.info('🔐 API: Successfully signed up', { userId: account.id });
    return account;
  } catch (error) {
    logger.error('🔐 API: Error signing up', { error });
    throw error;
  }
}

export default signUp;
