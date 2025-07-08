import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { fetchUserById } from '@/features/users/api';
import type { EventAttendanceRow } from '../types/database';
import type { EventAttendance } from '../types/domain';

export async function fetchEventAttendees(
  supabase: SupabaseClient<Database>,
  eventId: string,
): Promise<EventAttendance[]> {
  // Get all event attendances for this event
  const { data: attendances, error } = (await supabase
    .from('event_attendances')
    .select('*')
    .eq('event_id', eventId)) as { 
    data: EventAttendanceRow[];
    error: QueryError | null;
  };

  if (error || !attendances) {
    return [];
  }

  // Fetch user data for each attendee and build EventAttendance objects
  const attendancePromises = attendances.map(async (attendance) => {
    const user = await fetchUserById(supabase, attendance.user_id);
    
    // Only include attendances where we successfully fetched user data
    if (!user) {
      return null;
    }

    return {
      eventId: attendance.event_id,
      userId: attendance.user_id,
      status: attendance.status as 'attending' | 'not_attending' | 'maybe',
      createdAt: new Date(attendance.created_at),
      updatedAt: new Date(attendance.updated_at),
      user,
    } as EventAttendance;
  });

  const results = await Promise.all(attendancePromises);
  
  // Filter out any null results
  return results.filter((attendance): attendance is EventAttendance => attendance !== null);
}