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

  // If no preferences exist, return default preferences
  if (!data) {
    const defaultPreferences: NotificationPreferences = {
      user_id: '', // Will be set by the database
      // Existing preferences
      comments_on_resources: true,
      comment_replies: true,
      resource_claims: true,
      new_messages: true,
      community_resources: true,
      // Social Interactions
      shoutout_received: true,
      connection_request: true,
      connection_accepted: true,
      // My Resources
      resource_claim_cancelled: true,
      resource_claim_completed: true,
      // My Registrations
      claim_approved: true,
      claim_rejected: true,
      claimed_resource_updated: true,
      claimed_resource_cancelled: true,
      // My Communities
      community_member_joined: true,
      community_member_left: true,
      // Community Activity
      new_event: true,
      // Trust & Recognition
      trust_points_received: true,
      trust_level_changed: true,
      // Global settings
      email_enabled: false,
      push_enabled: false,
      // Timestamps
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    return defaultPreferences;
  }

  // Ensure messages are always enabled
  return {
    ...data,
    new_messages: true, // Force messages to always be enabled
  };
}