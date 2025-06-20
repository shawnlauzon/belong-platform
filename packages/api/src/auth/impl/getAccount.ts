import { getBelongClient, type BelongClient } from '@belongnetwork/core';
import { Account } from '@belongnetwork/types';

/**
 * Gets the currently authenticated account
 * @param client - Optional configured Belong client
 * @returns A promise that resolves to the current account, or null if not authenticated
 * @throws {Error} If there's an error fetching the current account
 */
export async function getAccount(client?: BelongClient): Promise<Account | null> {
  // Use provided client or fall back to global client
  const globalClient = getBelongClient();
  const supabaseClient = client?.supabase || globalClient.supabase;
  const loggerClient = client?.logger || globalClient.logger;

  loggerClient.debug('🔐 API: Getting current account');

  try {
    const { data: { user }, error } = await supabaseClient.auth.getUser();

    if (error) {
      // AuthSessionMissingError is expected for unauthenticated users - log at debug level
      if (error.message?.includes('Auth session missing')) {
        loggerClient.debug('🔐 API: No auth session found (user not authenticated)', { error: error.message });
      } else {
        loggerClient.error('🔐 API: Failed to get current account', { error });
      }
      return null;
    }

    if (!user) {
      loggerClient.debug('🔐 API: No authenticated user found');
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

    loggerClient.debug('🔐 API: Successfully retrieved current account', { userId: account.id });
    return account;
  } catch (error) {
    // AuthSessionMissingError is expected for unauthenticated users - handle gracefully
    if (error instanceof Error && error.message?.includes('Auth session missing')) {
      loggerClient.debug('🔐 API: No auth session found (user not authenticated)', { error: error.message });
      return null;
    } else {
      loggerClient.error('🔐 API: Error getting current account', { error });
      throw error;
    }
  }
}

export default getAccount;