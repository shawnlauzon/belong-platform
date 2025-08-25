import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { MemberConnectionCode } from '../types';
import { toDomainMemberCode } from '../transformers';
import { logger } from '@/shared';
import { getAuthIdOrThrow } from '@/shared/utils/auth-helpers';

export async function regenerateMemberCode(
  supabase: SupabaseClient<Database>,
  communityId: string,
): Promise<MemberConnectionCode> {
  logger.debug('🔗 API: Regenerating member connection code', { communityId });

  try {
    const currentUserId = await getAuthIdOrThrow(supabase);

    // Use the database function to handle regeneration with elevated privileges
    const { data: newCodeData, error: functionError } = await supabase
      .rpc('regenerate_member_connection_code', {
        p_user_id: currentUserId,
        p_community_id: communityId,
      });

    if (functionError) {
      logger.error('🔗 API: Failed to regenerate member connection code via function', {
        error: functionError,
        communityId,
      });
      throw functionError;
    }

    const newCode = newCodeData as string;

    // Fetch the complete record to return proper domain object
    const { data: codeRecord, error: fetchError } = await supabase
      .from('community_member_codes')
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

    const memberCode = toDomainMemberCode(codeRecord);
    logger.info('🔗 API: Successfully regenerated member connection code', {
      communityId,
      newCode: memberCode.code,
    });

    return memberCode;
  } catch (error) {
    logger.error('🔗 API: Error regenerating member connection code', {
      error,
      communityId,
    });
    throw error;
  }
}