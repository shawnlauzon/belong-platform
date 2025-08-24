import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { MemberConnectionCode } from '../types';
import { toDomainMemberCode, toCommunityMemberCodeInsertRow } from '../transformers';
import { generateConnectionCode } from '../utils/codeGenerator';
import { logger } from '@/shared';
import { getAuthIdOrThrow } from '@/shared/utils/auth-helpers';

export async function getMemberConnectionCode(
  supabase: SupabaseClient<Database>,
  communityId: string,
): Promise<MemberConnectionCode> {
  logger.debug('🔗 API: Getting member connection code', { communityId });

  try {
    const currentUserId = await getAuthIdOrThrow(supabase);

    // Check if user already has a code for this community
    const { data: existingCode, error: fetchError } = await supabase
      .from('community_member_codes')
      .select('*')
      .eq('user_id', currentUserId)
      .eq('community_id', communityId)
      .maybeSingle();

    if (fetchError) {
      logger.error('🔗 API: Failed to fetch existing member code', {
        error: fetchError,
        communityId,
        userId: currentUserId,
      });
      throw fetchError;
    }

    // Return existing code if found
    if (existingCode) {
      const memberCode = toDomainMemberCode(existingCode);
      logger.debug('🔗 API: Found existing member code', {
        communityId,
        code: memberCode.code,
      });
      return memberCode;
    }

    // Generate new code
    let newCode: string;
    let insertData: MemberConnectionCode;
    let attempts = 0;
    const maxAttempts = 10;

    // Try to create unique code
    while (attempts < maxAttempts) {
      newCode = generateConnectionCode();
      insertData = {
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
        logger.info('🔗 API: Created new member connection code', {
          communityId,
          code: memberCode.code,
        });
        return memberCode;
      }

      // If unique violation, try again with new code
      if (error.code === '23505') {
        attempts++;
        logger.debug('🔗 API: Code collision, retrying', { 
          code: newCode, 
          attempts 
        });
        continue;
      }

      // Other error, throw it
      logger.error('🔗 API: Failed to create member connection code', {
        error,
        communityId,
      });
      throw error;
    }

    // Max attempts reached
    const maxAttemptsError = new Error(
      `Failed to generate unique connection code after ${maxAttempts} attempts`,
    );
    logger.error('🔗 API: Max attempts reached for code generation', {
      communityId,
      maxAttempts,
    });
    throw maxAttemptsError;
  } catch (error) {
    logger.error('🔗 API: Error getting member connection code', {
      error,
      communityId,
    });
    throw error;
  }
}