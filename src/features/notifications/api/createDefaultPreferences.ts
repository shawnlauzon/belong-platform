import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { logger } from '@/shared';
import type { NotificationPreferencesInsert } from '../types/notificationPreferences';

/**
 * Creates default notification preferences for a user using group-level toggles
 * All notification groups are enabled by default, email/push disabled
 */
export async function createDefaultPreferences(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<void> {
  logger.debug('Creating default notification preferences', { userId });

  const defaultPreferences: NotificationPreferencesInsert = {
    user_id: userId,
    // Group-level notification controls (7 groups, all enabled by default)
    social_interactions: true,      // Controls: comments, replies, shoutouts, connections
    my_resources: true,            // Controls: resource claims, cancellations, completions
    my_registrations: true,        // Controls: claim approvals, rejections, resource updates/cancellations
    my_communities: true,          // Controls: member joins/leaves for communities you organize
    community_activity: true,      // Controls: new resources/events in communities you're a member of
    trust_recognition: true,       // Controls: trust points and level changes
    // Messages (granular control as documented)
    direct_messages: true,         // Direct 1:1 messages
    community_messages: true,      // Community chat messages
    // Global settings (disabled by default for privacy)
    email_enabled: false,
    push_enabled: false,
  };

  const { error } = await supabase
    .from('notification_preferences')
    .insert(defaultPreferences)
    .select()
    .single();

  if (error) {
    logger.error('Failed to create default notification preferences', {
      userId,
      error,
    });
    throw error;
  }

  logger.info('Successfully created default notification preferences', {
    userId,
  });
}