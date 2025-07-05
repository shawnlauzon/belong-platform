import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { logger } from '@/shared';

/**
 * Signs out the current user
 */
export async function signOut(
  supabase: SupabaseClient<Database>,
): Promise<void> {
  logger.debug('🔐 API: Signing out user');

  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      logger.error('🔐 API: Failed to sign out', { error });
      throw error;
    }

    logger.info('🔐 API: Successfully signed out');
  } catch (error) {
    logger.error('🔐 API: Error signing out', { error });
    throw error;
  }
}