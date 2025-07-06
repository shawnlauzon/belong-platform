import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { EventAttendance, EventAttendanceData } from '@/features/events';
import { forDbInsertAttendance, toDomainEventAttendance } from '@/features/events/transformers/eventTransformer';
import { EventAttendanceRow } from '../types/database';

export async function joinEvent(
  supabase: SupabaseClient<Database>,
  eventId: string,
  userId: string,
  status: 'attending' | 'maybe' = 'attending',
): Promise<EventAttendance | null> {
  const attendanceData: EventAttendanceData = {
    eventId,
    userId,
    status,
  };

  const dbData = forDbInsertAttendance(attendanceData);

  // Use upsert to handle cases where user already has a record
  const { data, error } = (await supabase
    .from('event_attendances')
    .upsert(dbData, { onConflict: 'event_id,user_id' })
    .select()
    .single()) as { data: EventAttendanceRow; error: QueryError | null };

  if (error || !data) {
    throw new Error(error?.message || 'Failed to join event');
  }

  // Note: Attendee count is maintained by database triggers or manual updates
  // For now we skip automatic count updates to keep the implementation simple

  return toDomainEventAttendance(data);
}