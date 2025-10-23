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
} from '@/features/invitations/utils/codeUtils';
import { logger } from '@/shared';

export async function joinCommunityWithCode(
  supabase: SupabaseClient<Database>,
  userId: string,
  code: string,
): Promise<CommunityMembership> {
  logger.debug('🏘️ API: Joining community with code!', { code });

  try {
    const currentUserId = userId;
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
      .from('invitation_codes')
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

    // Create direct connection with the code owner
    const { error: connectionError } = await supabase.rpc('create_user_connection', {
      p_user_id: currentUserId,
      p_other_id: memberCode.user_id,
      p_community_id: communityId,
    });

    if (connectionError) {
      logger.error('🏘️ API: Failed to create direct connection', {
        error: connectionError,
        communityId,
        codeOwnerId: memberCode.user_id,
        userId: currentUserId,
      });
      // Don't throw here - community join succeeded, connection is bonus
    } else {
      logger.debug('🏘️ API: Successfully created direct connection', {
        communityId,
        codeOwnerId: memberCode.user_id,
        userId: currentUserId,
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