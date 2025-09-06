import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

export async function markAllAsRead(
  supabase: SupabaseClient<Database>
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .eq('is_read', false);

  if (error) {
    throw error;
  }
}