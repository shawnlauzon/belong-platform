import { logger } from '@belongnetwork/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@belongnetwork/types/database';

/**
 * Signs out the current user
 * @param supabase - The supabase client instance
 * @returns A promise that resolves when the user is signed out
 * @throws {Error} If sign out fails
 */
export async function signOut(supabase?: SupabaseClient<Database>): Promise<void> {
  if (!supabase) {
    throw new Error('signOut requires a supabase client. Use the hook pattern instead.');
  }
  
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

export default signOut;
