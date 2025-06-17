import { getBelongClient } from '@belongnetwork/core';

/**
 * Signs out the current user
 * @returns A promise that resolves when the user is signed out
 * @throws {Error} If sign out fails
 */
export async function signOut(): Promise<void> {
  const { supabase, logger } = getBelongClient();
  
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
