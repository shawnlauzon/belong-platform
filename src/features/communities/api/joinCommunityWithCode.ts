import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { CommunityMembership } from '../types';
import {
  toDomainMembershipInfo,
  toCommunityMembershipInsertRow,
} from '../transformers/communityTransformer';
import {
  normalizeConnectionCode,
  isValidConnectionCode,
} from '@/features/connections/utils/codeUtils';
import { logger } from '@/shared';
import { getAuthIdOrThrow } from '@/shared/utils/auth-helpers';

export async function joinCommunityWithCode(
  supabase: SupabaseClient<Database>,
  code: string,
): Promise<CommunityMembership> {
  logger.debug('🏘️ API: Joining community with code!', { code });

  try {
    const currentUserId = await getAuthIdOrThrow(supabase);
    const normalizedCode = normalizeConnectionCode(code);

    // Validate code format
    if (!isValidConnectionCode(normalizedCode)) {
      const error = new Error('Invalid connection code format');
      logger.error('🏘️ API: Invalid connection code format', {
        code: normalizedCode,
        userId: currentUserId,
      });
      throw error;
    }

    // Find the connection code
    const { data: memberCode, error: codeError } = await supabase
      .from('community_member_codes')
      .select('*')
      .eq('code', normalizedCode)
      .eq('is_active', true)
      .maybeSingle();

    if (codeError) {
      logger.error('🏘️ API: Error fetching connection code', {
        error: codeError,
        code: normalizedCode,
      });
      throw codeError;
    }

    if (!memberCode) {
      const error = new Error('Connection code not found or inactive');
      logger.error('🏘️ API: Connection code not found', {
        code: normalizedCode,
        userId: currentUserId,
      });
      throw error;
    }

    // Cannot connect to yourself
    if (memberCode.user_id === currentUserId) {
      const error = new Error('Cannot create connection with yourself');
      logger.error('🏘️ API: User trying to use their own code', {
        code: normalizedCode,
        userId: currentUserId,
      });
      throw error;
    }

    const communityId = memberCode.community_id;

    // Check if user is already a member of this community
    const { data: existingMembership, error: checkError } = await supabase
      .from('community_memberships')
      .select('*')
      .eq('user_id', currentUserId)
      .eq('community_id', communityId)
      .maybeSingle();

    if (checkError) {
      logger.error('🏘️ API: Failed to check existing membership', {
        error: checkError,
        communityId,
        userId: currentUserId,
      });
      throw checkError;
    }

    if (existingMembership) {
      const error = new Error('User is already a member of this community');
      logger.error('🏘️ API: User already a member', {
        communityId,
        userId: currentUserId,
      });
      throw error;
    }

    // Join the community
    const membershipData = toCommunityMembershipInsertRow({
      userId: currentUserId,
      communityId,
    });

    const { data, error } = await supabase
      .from('community_memberships')
      .insert(membershipData)
      .select()
      .single();

    if (error) {
      logger.error('🏘️ API: Failed to join community', {
        error,
        communityId,
        code: normalizedCode,
      });
      throw error;
    }

    if (!data) {
      logger.error('🏘️ API: No data returned after joining community');
      throw new Error('No data returned after joining community');
    }

    const membership = toDomainMembershipInfo(data);

    // Create connection request with the code owner
    const { error: connectionError } = await supabase
      .from('connection_requests')
      .insert({
        community_id: communityId,
        initiator_id: memberCode.user_id,
        requester_id: currentUserId,
        status: 'pending',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      });

    if (connectionError) {
      logger.error('🏘️ API: Failed to create connection request', {
        error: connectionError,
        communityId,
        initiatorId: memberCode.user_id,
        requesterId: currentUserId,
      });
      // Don't throw here - community join succeeded, connection request is bonus
    } else {
      logger.debug('🏘️ API: Successfully created connection request', {
        communityId,
        initiatorId: memberCode.user_id,
        requesterId: currentUserId,
      });
    }

    logger.debug('🏘️ API: Successfully joined community with code', {
      communityId,
      userId: currentUserId,
      code: normalizedCode,
    });
    return membership;
  } catch (error) {
    logger.error('🏘️ API: Error joining community with code', {
      error,
      code,
    });
    throw error;
  }
}