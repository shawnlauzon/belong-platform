import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { NotificationPreferences } from '../types/notificationPreferences';

export async function fetchPreferences(
  supabase: SupabaseClient<Database>
): Promise<NotificationPreferences | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('notification_preferences')
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  // If no data or no preferences exist, return default preferences
  if (!data || !data.notification_preferences) {
    return {
      social_interactions: true,
      my_resources: true,
      my_registrations: true,
      my_communities: true,
      community_activity: true,
      trust_recognition: true,
      direct_messages: true,
      community_messages: true,
      email_enabled: false,
      push_enabled: false,
    };
  }

  // Parse the JSON preferences and merge with defaults
  const preferences = data.notification_preferences as Record<string, boolean>;
  
  return {
    social_interactions: preferences.social_interactions ?? true,
    my_resources: preferences.my_resources ?? true,
    my_registrations: preferences.my_registrations ?? true,
    my_communities: preferences.my_communities ?? true,
    community_activity: preferences.community_activity ?? true,
    trust_recognition: preferences.trust_recognition ?? true,
    direct_messages: preferences.direct_messages ?? true,
    community_messages: preferences.community_messages ?? true,
    email_enabled: preferences.email_enabled ?? false,
    push_enabled: preferences.push_enabled ?? false,
  };
}