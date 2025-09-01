import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { NotificationPreferencesUpdate } from '../types/notificationPreferences';

export async function updatePreferences(
  supabase: SupabaseClient<Database>,
  preferences: NotificationPreferencesUpdate & { user_id: string }
): Promise<void> {
  const { error } = await supabase
    .from('notification_preferences')
    .upsert(preferences, { onConflict: 'user_id' });

  if (error) {
    throw error;
  }
}