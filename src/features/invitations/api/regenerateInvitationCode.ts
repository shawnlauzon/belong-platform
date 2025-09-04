import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { InvitationCode } from '../types';
import { toDomainInvitationCode } from '../transformers';
import { logger } from '@/shared';
import { getAuthIdOrThrow } from '@/shared/utils/auth-helpers';

export async function regenerateInvitationCode(
  supabase: SupabaseClient<Database>,
  communityId: string,
): Promise<InvitationCode> {
  logger.debug('🔗 API: Regenerating invitation code', { communityId });

  try {
    const currentUserId = await getAuthIdOrThrow(supabase);

    // Use the database function to handle regeneration with elevated privileges
    const { data: newCodeData, error: functionError } = await supabase
      .rpc('regenerate_invitation_code', {
        p_user_id: currentUserId,
        p_community_id: communityId,
      });

    if (functionError) {
      logger.error('🔗 API: Failed to regenerate invitation code via function', {
        error: functionError,
        communityId,
      });
      throw functionError;
    }

    const newCode = newCodeData as string;

    // Fetch the complete record to return proper domain object
    const { data: codeRecord, error: fetchError } = await supabase
      .from('invitation_codes')
      .select()
      .eq('code', newCode)
      .eq('user_id', currentUserId)
      .eq('community_id', communityId)
      .eq('is_active', true)
      .single();

    if (fetchError || !codeRecord) {
      logger.error('🔗 API: Failed to fetch regenerated code record', {
        error: fetchError,
        newCode,
        communityId,
      });
      throw fetchError || new Error('Failed to fetch regenerated code record');
    }

    const invitationCode = toDomainInvitationCode(codeRecord);
    logger.info('🔗 API: Successfully regenerated invitation code', {
      communityId,
      newCode: invitationCode.code,
    });

    return invitationCode;
  } catch (error) {
    logger.error('🔗 API: Error regenerating invitation code', {
      error,
      communityId,
    });
    throw error;
  }
}