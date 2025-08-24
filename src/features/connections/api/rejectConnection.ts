import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { logger } from '@/shared';
import { getAuthIdOrThrow } from '@/shared/utils/auth-helpers';

export async function rejectConnection(
  supabase: SupabaseClient<Database>,
  connectionRequestId: string,
): Promise<void> {
  logger.debug('🔗 API: Rejecting connection request', { connectionRequestId });

  try {
    const currentUserId = await getAuthIdOrThrow(supabase);

    // Update the request status to rejected
    const { data, error } = await supabase
      .from('connection_requests')
      .update({
        status: 'rejected',
        responded_at: new Date().toISOString(),
      })
      .eq('id', connectionRequestId)
      .eq('initiator_id', currentUserId)
      .eq('status', 'pending')
      .select()
      .single();

    if (error) {
      logger.error('🔗 API: Error rejecting connection request', {
        error,
        connectionRequestId,
      });
      throw error;
    }

    if (!data) {
      const notFoundError = new Error(
        'Connection request not found or not authorized',
      );
      logger.error('🔗 API: Connection request not found for rejection', {
        connectionRequestId,
        userId: currentUserId,
      });
      throw notFoundError;
    }

    logger.info('🔗 API: Successfully rejected connection request', {
      connectionRequestId,
      initiatorId: data.initiator_id,
      requesterId: data.requester_id,
    });
  } catch (error) {
    logger.error('🔗 API: Error rejecting connection', {
      error,
      connectionRequestId,
    });
    throw error;
  }
}