import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { User } from '@/features/users';
import { fetchUserById } from '@/features/users/api';
import type { EventAttendanceRow } from '../types/database';

export async function fetchEventAttendees(
  supabase: SupabaseClient<Database>,
  eventId: string,
): Promise<User[]> {
  // First, get the list of user IDs who are attending
  const { data: attendances, error } = (await supabase
    .from('event_attendances')
    .select('user_id')
    .eq('event_id', eventId)
    .eq('status', 'attending')) as { 
    data: Pick<EventAttendanceRow, 'user_id'>[];
    error: QueryError | null;
  };

  if (error || !attendances) {
    return [];
  }

  // Then fetch user data for each attendee
  const users = await Promise.all(
    attendances.map(attendance => fetchUserById(supabase, attendance.user_id))
  );

  // Filter out any null results
  return users.filter((user): user is User => user !== null);
}