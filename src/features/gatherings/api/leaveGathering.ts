import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { GatheringResponse, GatheringResponseInput } from '../types';
import type { GatheringResponseRow } from '../types/gatheringRow';
import {
  toGatheringResponseInsertRow,
  toDomainGatheringResponse,
} from '../transformers/gatheringTransformer';
import { logger } from '@/shared';
import { getAuthIdOrThrow } from '@/shared/utils/auth-helpers';

export async function leaveGathering(
  supabase: SupabaseClient<Database>,
  gatheringId: string,
): Promise<GatheringResponse | null> {
  logger.debug('📅 API: Leaving gathering', { gatheringId });

  try {
    const currentUserId = await getAuthIdOrThrow(supabase);

    const attendanceData: GatheringResponseInput = {
      gatheringId,
      userId: currentUserId,
      status: 'not_attending',
    };

    const dbData = toGatheringResponseInsertRow(attendanceData);

    const { data, error } = (await supabase
      .from('gathering_responses')
      .upsert(dbData, { onConflict: 'gathering_id,user_id' })
      .select()
      .single()) as { data: GatheringResponseRow; error: QueryError | null };

    if (error) {
      logger.error('📅 API: Failed to leave gathering', {
        error,
        gatheringId,
      });
      throw error;
    }

    if (!data) {
      logger.error('📅 API: No data returned after leaving gathering');
      return null;
    }

    const attendance = toDomainGatheringResponse(data);

    logger.debug('📅 API: Successfully left gathering', {
      gatheringId,
      userId: currentUserId,
      status: 'not_attending',
    });

    return attendance;
  } catch (error) {
    logger.error('📅 API: Error leaving gathering', {
      error,
      gatheringId,
    });
    throw error;
  }
}
