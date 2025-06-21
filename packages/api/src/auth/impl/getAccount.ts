import { logger } from '@belongnetwork/core';
import { Account } from '@belongnetwork/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@belongnetwork/types/database';

/**
 * Gets the currently authenticated account
 * @param supabase - The supabase client instance
 * @returns A promise that resolves to the current account, or null if not authenticated
 * @throws {Error} If there's an error fetching the current account
 */
export async function getAccount(supabase?: SupabaseClient<Database>): Promise<Account | null> {
  if (!supabase) {
    throw new Error('getAccount requires a supabase client. Use the hook pattern instead.');
  }

  logger.debug('🔐 API: Getting current account');

  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      // AuthSessionMissingError is expected for unauthenticated users - log at debug level
      if (error.message?.includes('Auth session missing')) {
        logger.debug('🔐 API: No auth session found (user not authenticated)', { error: error.message });
      } else {
        logger.error('🔐 API: Failed to get current account', { error });
      }
      return null;
    }

    if (!user) {
      logger.debug('🔐 API: No authenticated user found');
      return null;
    }

    // Transform Supabase user response to Account domain object
    const account: Account = {
      id: user.id,
      email: user.email!,
      firstName: user.user_metadata?.first_name || '',
      lastName: user.user_metadata?.last_name || '',
      fullName: user.user_metadata?.full_name || '',
      avatarUrl: user.user_metadata?.avatar_url,
      location: user.user_metadata?.location,
      createdAt: new Date(user.created_at!),
      updatedAt: new Date(user.updated_at!),
    };

    logger.debug('🔐 API: Successfully retrieved current account', { userId: account.id });
    return account;
  } catch (error) {
    // AuthSessionMissingError is expected for unauthenticated users - handle gracefully
    if (error instanceof Error && error.message?.includes('Auth session missing')) {
      logger.debug('🔐 API: No auth session found (user not authenticated)', { error: error.message });
      return null;
    } else {
      logger.error('🔐 API: Error getting current account', { error });
      throw error;
    }
  }
}

export default getAccount;