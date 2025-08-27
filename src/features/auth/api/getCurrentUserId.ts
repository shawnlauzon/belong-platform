import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { logger } from '@/shared';

/**
 * Gets the current authenticated user ID from Supabase auth
 * Lightweight function that returns only the user ID
 */
export async function getCurrentUserId(
  supabase: SupabaseClient<Database>,
): Promise<string | null> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      logger.debug('🔐 API: Failed to get authenticated user', { error });
      throw error;
    }

    if (!user) {
      logger.debug('🔐 API: No authenticated user found');
      return null;
    }

    return user.id;
  } catch (error) {
    const err = error as Error;
    if (err.name === 'AuthSessionMissingError') {
      // Handle specific AuthSessionMissingError - this is expected when no session exists
      logger.debug('🔐 API: No auth session found');
      return null;
    }

    // For all other errors, log and re-throw
    logger.error('🔐 API: Error fetching current user ID', { error });
    throw error;
  }
}