import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { UserConnection } from '../types';
import { toDomainUserConnection } from '../transformers';
import { logger } from '@/shared';
import { getAuthIdOrThrow } from '@/shared/utils/auth-helpers';

export async function approveConnection(
  supabase: SupabaseClient<Database>,
  connectionRequestId: string,
): Promise<UserConnection> {
  logger.debug('🔗 API: Approving connection request', { connectionRequestId });

  try {
    const currentUserId = await getAuthIdOrThrow(supabase);

    // Verify the request exists and user is the initiator
    const { data: request, error: fetchError } = await supabase
      .from('connection_requests')
      .select('*')
      .eq('id', connectionRequestId)
      .eq('initiator_id', currentUserId)
      .eq('status', 'pending')
      .single();

    if (fetchError) {
      logger.error('🔗 API: Error fetching connection request', {
        error: fetchError,
        connectionRequestId,
      });
      throw fetchError;
    }

    if (!request) {
      const notFoundError = new Error(
        'Connection request not found or not authorized',
      );
      logger.error('🔗 API: Connection request not found', {
        connectionRequestId,
        userId: currentUserId,
      });
      throw notFoundError;
    }

    // Use the database function to create the bidirectional connection
    const { data: connectionId, error: approveError } = await supabase.rpc(
      'create_user_connection',
      {
        request_id: connectionRequestId,
      },
    );

    if (approveError) {
      logger.error('🔗 API: Error approving connection', {
        error: approveError,
        connectionRequestId,
      });
      throw approveError;
    }

    if (!connectionId) {
      logger.error('🔗 API: No connection ID returned from approval');
      throw new Error('No connection ID returned from approval');
    }

    // Fetch the created connection
    const { data: connectionData, error: connectionError } = await supabase
      .from('user_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (connectionError) {
      logger.error('🔗 API: Error fetching created connection', {
        error: connectionError,
        connectionId,
      });
      throw connectionError;
    }

    if (!connectionData) {
      logger.error('🔗 API: No connection data found after creation');
      throw new Error('No connection data found after creation');
    }

    const userConnection = toDomainUserConnection(connectionData);

    logger.info('🔗 API: Successfully approved connection', {
      connectionId: userConnection.id,
      communityId: userConnection.communityId,
      userAId: userConnection.userAId,
      userBId: userConnection.userBId,
    });

    return userConnection;
  } catch (error) {
    logger.error('🔗 API: Error approving connection', {
      error,
      connectionRequestId,
    });
    throw error;
  }
}