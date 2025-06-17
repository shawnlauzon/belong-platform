import { logger, supabase } from '@belongnetwork/core';
import type { BelongClient } from '@belongnetwork/core';
import { User } from '@belongnetwork/types';
import { toDomainUser } from '../../users/impl/userTransformer';

/**
 * Gets the currently authenticated user
 * @param client - Optional configured Belong client
 * @returns A promise that resolves to the current user, or null if not authenticated
 * @throws {Error} If there's an error fetching the current user
 */
export async function getCurrentUser(client?: BelongClient): Promise<User | null> {
  // Use provided client or fall back to singleton
  const supabaseClient = client?.supabase || supabase;
  const loggerClient = client?.logger || logger;

  loggerClient.debug('🔐 API: Getting current user');

  try {
    const { data: { user }, error } = await supabaseClient.auth.getUser();

    if (error) {
      loggerClient.error('🔐 API: Failed to get current user', { error });
      return null;
    }

    if (!user) {
      loggerClient.debug('🔐 API: No authenticated user found');
      return null;
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      loggerClient.warn('🔐 API: Could not fetch user profile', { profileError });
    }

    let domainUser: User;

    if (profile) {
      // Transform the profile using the users feature transformer
      domainUser = toDomainUser(profile);
      // Override email from auth user (more authoritative)
      domainUser = {
        ...domainUser,
        email: user.email!,
        location: user.user_metadata?.location, // Get location from auth metadata
      };
    } else {
      // Fallback if no profile exists - construct User object
      domainUser = {
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
    }

    loggerClient.debug('🔐 API: Successfully retrieved current user', { userId: domainUser.id });
    return domainUser;
  } catch (error) {
    loggerClient.error('🔐 API: Error getting current user', { error });
    throw error;
  }
}

export default getCurrentUser;
