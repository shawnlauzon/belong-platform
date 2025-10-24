import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { UpdateConnectionInput, UserConnection } from '../types';
import { toDomainUserConnection } from '../transformers';
import { logger } from '@/shared';

export async function updateConnection(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: UpdateConnectionInput,
): Promise<UserConnection> {
  logger.debug('🔗 API: Updating connection', {
    userId,
    ...input,
  });

  try {
    const currentUserId = userId;

    // Update the connection
    const { data: connection, error } = await supabase
      .from('user_connections')
      .update({ strength: input.strength })
      .eq('user_id', currentUserId)
      .eq('other_id', input.otherId)
      .select()
      .single();

    if (error) {
      logger.error('🔗 API: Failed to update connection', {
        error,
        userId: currentUserId,
        ...input,
      });
      throw error;
    }

    if (!connection) {
      throw new Error('Connection not found');
    }

    const updatedConnection = toDomainUserConnection(connection);
    logger.info('🔗 API: Successfully updated connection', {
      connectionId: updatedConnection.id,
      strength: updatedConnection.strength,
    });

    return updatedConnection;
  } catch (error) {
    logger.error('🔗 API: Error updating connection', {
      error,
      userId,
      ...input,
    });
    throw error;
  }
}
