import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { NotificationPreferencesUpdate } from '../types/notificationPreferences';

export async function updatePreferences(
  supabase: SupabaseClient<Database>,
  preferences: NotificationPreferencesUpdate
): Promise<void> {
  // Get current user ID
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      notification_preferences: preferences,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id);

  if (error) {
    throw error;
  }
}