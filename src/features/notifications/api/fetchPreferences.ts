import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { NotificationPreferences } from '../types/notificationPreferences';

export async function fetchPreferences(
  supabase: SupabaseClient<Database>
): Promise<NotificationPreferences | null> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  // If no preferences exist (shouldn't happen with the new trigger), return null
  // The trigger should create preferences automatically on signup
  if (!data) {
    return null;
  }

  return data;
}