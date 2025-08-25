import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type {
  ProcessConnectionLinkResponse,
  ConnectionRequest,
} from '../types';
import {
  toDomainConnectionRequest,
  toConnectionRequestInsertRow,
} from '../transformers';
import {
  normalizeConnectionCode,
  isValidConnectionCode,
} from '../utils/codeUtils';
import { logger } from '@/shared';
import { getAuthIdOrThrow } from '@/shared/utils/auth-helpers';

export async function createConnectionRequest(
  supabase: SupabaseClient<Database>,
  code: string,
): Promise<ProcessConnectionLinkResponse> {
  logger.debug('🔗 API: Creating connection request from code', { code });

  try {
    const currentUserId = await getAuthIdOrThrow(supabase);
    const normalizedCode = normalizeConnectionCode(code);

    // Validate code format
    if (!isValidConnectionCode(normalizedCode)) {
      return {
        success: false,
        message: 'Invalid connection code format',
      };
    }

    // Find the connection code
    const { data: memberCode, error: codeError } = await supabase
      .from('community_member_codes')
      .select(
        `
        *,
        communities!inner(
          id,
          name
        )
      `,
      )
      .eq('code', normalizedCode)
      .eq('is_active', true)
      .maybeSingle();

    if (codeError) {
      logger.error('🔗 API: Error fetching connection code', {
        error: codeError,
        code: normalizedCode,
      });
      throw codeError;
    }

    if (!memberCode) {
      return {
        success: false,
        message: 'Connection code not found or inactive',
      };
    }

    // Cannot connect to yourself
    if (memberCode.user_id === currentUserId) {
      return {
        success: false,
        message: 'Cannot create connection with yourself',
      };
    }

    // Check if user is member of the community
    const { data: membership, error: membershipError } = await supabase
      .from('community_memberships')
      .select('user_id')
      .eq('user_id', currentUserId)
      .eq('community_id', memberCode.community_id)
      .maybeSingle();

    if (membershipError) {
      logger.error('🔗 API: Error checking community membership', {
        error: membershipError,
        communityId: memberCode.community_id,
        userId: currentUserId,
      });
      throw membershipError;
    }

    // If not a member, require joining community first
    if (!membership) {
      return {
        success: false,
        requiresJoinCommunity: true,
        communityId: memberCode.community_id,
        communityName: memberCode.communities?.name,
        message: 'You must join this community before connecting',
      };
    }

    // Check for existing connection request
    const { data: existingRequest, error: requestError } = await supabase
      .from('connection_requests')
      .select('id, status')
      .eq('community_id', memberCode.community_id)
      .eq('initiator_id', memberCode.user_id)
      .eq('requester_id', currentUserId)
      .maybeSingle();

    if (requestError) {
      logger.error('🔗 API: Error checking existing connection request', {
        error: requestError,
        communityId: memberCode.community_id,
      });
      throw requestError;
    }

    // Handle existing request
    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return {
          success: true,
          connectionRequestId: existingRequest.id,
          message: 'Connection request already pending',
        };
      }

      if (existingRequest.status === 'accepted') {
        return {
          success: true,
          message: 'Connection already established',
        };
      }

      if (existingRequest.status === 'rejected') {
        return {
          success: false,
          message: 'Connection request was previously rejected',
        };
      }
    }

    // Check for existing connection (bidirectional)
    const { data: existingConnection, error: connectionError } = await supabase
      .from('user_connections')
      .select('id')
      .eq('community_id', memberCode.community_id)
      .or(
        `and(user_a_id.eq.${memberCode.user_id},user_b_id.eq.${currentUserId}),and(user_a_id.eq.${currentUserId},user_b_id.eq.${memberCode.user_id})`,
      )
      .maybeSingle();

    if (connectionError) {
      logger.error('🔗 API: Error checking existing connection', {
        error: connectionError,
        communityId: memberCode.community_id,
      });
      throw connectionError;
    }

    if (existingConnection) {
      return {
        success: true,
        message: 'Connection already established',
      };
    }

    // Create new connection request
    const connectionRequestData: Pick<
      ConnectionRequest,
      'communityId' | 'initiatorId' | 'requesterId'
    > = {
      communityId: memberCode.community_id,
      initiatorId: memberCode.user_id,
      requesterId: currentUserId,
    };

    const insertRow = toConnectionRequestInsertRow(connectionRequestData);

    const { data, error } = await supabase
      .from('connection_requests')
      .insert(insertRow)
      .select()
      .single();

    if (error) {
      logger.error('🔗 API: Failed to create connection request', {
        error,
        communityId: memberCode.community_id,
      });
      throw error;
    }

    if (!data) {
      logger.error(
        '🔗 API: No data returned after creating connection request',
      );
      throw new Error('No data returned after creating connection request');
    }

    const connectionRequest = toDomainConnectionRequest(data);

    logger.info('🔗 API: Created connection request', {
      requestId: connectionRequest.id,
      communityId: memberCode.community_id,
      initiatorId: memberCode.user_id,
      requesterId: currentUserId,
    });

    return {
      success: true,
      connectionRequestId: connectionRequest.id,
      message: 'Connection request created successfully',
    };
  } catch (error) {
    logger.error('🔗 API: Error creating connection request', {
      error,
      code,
    });
    throw error;
  }
}
