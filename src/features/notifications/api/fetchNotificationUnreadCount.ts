import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { getAuthUserId } from '@/features/auth/api';

export async function fetchNotificationUnreadCount(
  supabase: SupabaseClient<Database>,
): Promise<number> {
  const userId = await getAuthUserId(supabase);
  if (!userId) {
    throw new Error('User not authenticated');
  }

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
