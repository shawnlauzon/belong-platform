import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { GatheringResponse, GatheringResponseInput } from '../types';
import {
  toGatheringResponseInsertRow,
  toDomainGatheringResponse,
} from '../transformers/gatheringTransformer';
import { logger } from '@/shared';
import { getAuthIdOrThrow } from '@/shared/utils/auth-helpers';
import { GatheringResponseRow } from '../types/gatheringRow';

// Helper function to check existing attendance
async function getExistingAttendance(
  supabase: SupabaseClient<Database>,
  gatheringId: string,
  userId: string,
): Promise<{ status: 'attending' | 'maybe' | 'not_attending' } | null> {
  const { data, error } = await supabase
    .from('gathering_responses')
    .select('status')
    .eq('gathering_id', gatheringId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    logger.error('📅 API: Failed to check existing attendance', {
      error,
      gatheringId,
      userId,
    });
    throw error;
  }

  return data as { status: 'attending' | 'maybe' | 'not_attending' } | null;
}

// Helper function to check gathering capacity using stored attendee_count
async function checkGatheringCapacity(
  supabase: SupabaseClient<Database>,
  gatheringId: string,
): Promise<void> {
  const { data: gatheringData, error: gatheringError } = await supabase
    .from('gatherings')
    .select('max_attendees, attendee_count')
    .eq('id', gatheringId)
    .single();

  if (gatheringError) {
    logger.error(
      '📅 API: Failed to fetch gathering details for capacity check',
      {
        error: gatheringError,
        gatheringId,
      },
    );
    throw gatheringError;
  }

  if (!gatheringData) {
    throw new Error('Gathering not found');
  }

  // Only check capacity if gathering has max attendees limit
  if (gatheringData.max_attendees !== null) {
    const currentAttendingCount = gatheringData.attendee_count;

    if (currentAttendingCount >= gatheringData.max_attendees) {
      logger.warn('📅 API: Gathering at max capacity', {
        gatheringId,
        currentAttendingCount,
        maxAttendees: gatheringData.max_attendees,
      });
      throw new Error('Gathering has reached maximum capacity');
    }
  }
}

// Helper function to save attendance
async function saveAttendance(
  supabase: SupabaseClient<Database>,
  attendanceData: GatheringResponseInput,
): Promise<GatheringResponse | null> {
  const dbData = toGatheringResponseInsertRow(attendanceData);

  const { data, error } = (await supabase
    .from('gathering_responses')
    .upsert(dbData, { onConflict: 'gathering_id,user_id' })
    .select()
    .single()) as { data: GatheringResponseRow; error: QueryError | null };

  if (error) {
    logger.error('📅 API: Failed to save attendance', {
      error,
      attendanceData,
    });
    throw error;
  }

  if (!data) {
    logger.error('📅 API: No data returned after saving attendance');
    return null;
  }

  return toDomainGatheringResponse(data);
}

export async function joinGathering(
  supabase: SupabaseClient<Database>,
  gatheringId: string,
  status: 'attending' | 'maybe' = 'attending',
): Promise<GatheringResponse | null> {
  logger.debug('📅 API: Joining gathering', { gatheringId, status });

  try {
    const currentUserId = await getAuthIdOrThrow(supabase);

    // Check if user is already joined with the same status
    const existingAttendance = await getExistingAttendance(
      supabase,
      gatheringId,
      currentUserId,
    );

    if (existingAttendance && existingAttendance.status === status) {
      logger.warn('📅 API: User already joined with same status', {
        gatheringId,
        userId: currentUserId,
        status,
      });
      throw new Error('Already joined this gathering with the same status');
    }

    // Check max attendees validation only for 'attending' status
    if (status === 'attending') {
      await checkGatheringCapacity(supabase, gatheringId);
    }

    const attendanceData: GatheringResponseInput = {
      gatheringId,
      userId: currentUserId,
      status,
    };

    const attendance = await saveAttendance(supabase, attendanceData);

    logger.debug('📅 API: Successfully joined gathering', {
      gatheringId,
      userId: currentUserId,
      status,
    });

    return attendance;
  } catch (error) {
    logger.error('📅 API: Error joining gathering', {
      error,
      gatheringId,
      status,
    });
    throw error;
  }
}
