import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

export async function markAsRead(
  supabase: SupabaseClient<Database>,
  notificationId: string | 'all',
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const query = supabase.from('notifications').update({
    read_at: new Date().toISOString(),
  });

  if (notificationId === 'all') {
    query.eq('user_id', user.id);
  } else {
    query.eq('id', notificationId);
  }

  const { error } = await query;

  if (error) {
    throw error;
  }
}
