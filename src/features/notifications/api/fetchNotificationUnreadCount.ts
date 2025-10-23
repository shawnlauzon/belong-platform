import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

export async function fetchNotificationUnreadCount(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<number> {

  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);

  if (error) {
    throw error;
  }

  return count || 0;
}
