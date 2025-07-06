import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

export async function leaveEvent(
  supabase: SupabaseClient<Database>,
  eventId: string,
  userId: string,
): Promise<void> {
  const { error } = (await supabase
    .from('event_attendances')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', userId)) as { error: QueryError | null };

  if (error) {
    throw new Error(error.message || 'Failed to leave event');
  }

  // Note: Attendee count is maintained by database triggers or manual updates
  // For now we skip automatic count updates to keep the implementation simple
}