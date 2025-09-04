import { logger } from '@/shared';
import type { Database } from '@/shared/types/database';
import { SupabaseClient } from '@supabase/supabase-js';
import type { InvitationDetails } from '../types';
import type { UserSummary } from '@/features/users/types';

export async function fetchInvitationDetails(
  supabase: SupabaseClient<Database>,
  invitationCode: string,
): Promise<InvitationDetails | null> {
  logger.debug('🔗 API: Fetching invitation details by code', {
    invitationCode,
  });

  try {
    const { data, error } = await supabase.rpc('get_invitation_details', {
      connection_code: invitationCode,
    });

    if (error) {
      logger.error('🔗 API: Failed to fetch invitation details by code', {
        invitationCode,
        error,
      });
      throw error;
    }

    if (!data || data.length === 0) {
      logger.debug('🔗 API: Invitation not found for code', {
        invitationCode,
      });
      return null;
    }

    const invitationRecord = data[0];
    
    // Construct UserSummary keeping fields separate as in public_profiles
    const user: UserSummary = {
      id: invitationRecord.user_id,
      firstName: invitationRecord.first_name || undefined,
      lastName: invitationRecord.last_name || undefined,
      fullName: invitationRecord.full_name || undefined,
      avatarUrl: invitationRecord.avatar_url || undefined,
    };

    const invitationDetails: InvitationDetails = {
      user,
      communityId: invitationRecord.community_id,
      isActive: invitationRecord.is_active,
      createdAt: new Date(invitationRecord.created_at),
    };

    logger.debug('🔗 API: Successfully fetched invitation details by code', {
      invitationCode,
      communityId: invitationDetails.communityId,
      firstName: invitationDetails.user.firstName,
    });
    return invitationDetails;
  } catch (error) {
    logger.error('🔗 API: Error fetching invitation details by code', {
      invitationCode,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
