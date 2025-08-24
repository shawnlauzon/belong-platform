import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { MemberConnectionCode } from '../types';
import { toDomainMemberCode, toCommunityMemberCodeInsertRow } from '../transformers';
import { generateConnectionCode } from '../utils/codeGenerator';
import { logger } from '@/shared';
import { getAuthIdOrThrow } from '@/shared/utils/auth-helpers';

export async function regenerateMemberCode(
  supabase: SupabaseClient<Database>,
  communityId: string,
): Promise<MemberConnectionCode> {
  logger.debug('🔗 API: Regenerating member connection code', { communityId });

  try {
    const currentUserId = await getAuthIdOrThrow(supabase);

    // Delete existing code
    const { error: deleteError } = await supabase
      .from('community_member_codes')
      .delete()
      .eq('user_id', currentUserId)
      .eq('community_id', communityId);

    if (deleteError) {
      logger.error('🔗 API: Error deleting existing member code', {
        error: deleteError,
        communityId,
      });
      throw deleteError;
    }

    // Generate new code with retry logic
    let newCode: string;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      newCode = generateConnectionCode();

      const insertData = {
        code: newCode,
        userId: currentUserId,
        communityId,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const insertRow = toCommunityMemberCodeInsertRow(insertData);

      const { data, error } = await supabase
        .from('community_member_codes')
        .insert(insertRow)
        .select()
        .single();

      if (!error && data) {
        const memberCode = toDomainMemberCode(data);
        logger.info('🔗 API: Successfully regenerated member connection code', {
          communityId,
          oldCode: 'deleted',
          newCode: memberCode.code,
        });
        return memberCode;
      }

      // If unique violation, try again with new code
      if (error.code === '23505') {
        attempts++;
        logger.debug('🔗 API: Code collision during regeneration, retrying', {
          code: newCode,
          attempts,
        });
        continue;
      }

      // Other error, throw it
      logger.error('🔗 API: Failed to regenerate member connection code', {
        error,
        communityId,
      });
      throw error;
    }

    // Max attempts reached
    const maxAttemptsError = new Error(
      `Failed to generate unique connection code after ${maxAttempts} attempts`,
    );
    logger.error('🔗 API: Max attempts reached during code regeneration', {
      communityId,
      maxAttempts,
    });
    throw maxAttemptsError;
  } catch (error) {
    logger.error('🔗 API: Error regenerating member connection code', {
      error,
      communityId,
    });
    throw error;
  }
}