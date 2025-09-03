// Notification preferences are now stored as JSONB in profiles table
// Define the interface directly since it's no longer a separate table

export interface NotificationPreferences {
  // Group-level notification controls (7 groups)
  social_interactions: boolean;      // Controls: comments, replies, shoutouts, connections
  my_resources: boolean;            // Controls: resource claims, cancellations, completions
  my_registrations: boolean;        // Controls: claim approvals, rejections, resource updates/cancellations
  my_communities: boolean;          // Controls: member joins/leaves for communities you organize
  community_activity: boolean;      // Controls: new resources/events in communities you're a member of
  trust_recognition: boolean;       // Controls: trust points and level changes

  // Messages (granular control)
  direct_messages: boolean;         // Direct 1:1 messages
  community_messages: boolean;      // Community chat messages

  // Global settings
  email_enabled: boolean;
  push_enabled: boolean;
}

export type NotificationPreferencesUpdate = Partial<NotificationPreferences>;
export type NotificationPreferencesInsert = NotificationPreferences;

// Group-level preference interface matching database schema
export interface GroupedNotificationPreferences {
  social_interactions: boolean;      // Controls: comments, replies, shoutouts, connections
  my_resources: boolean;            // Controls: resource claims, cancellations, completions
  my_registrations: boolean;        // Controls: claim approvals, rejections, resource updates/cancellations
  my_communities: boolean;          // Controls: member joins/leaves for communities you organize
  community_activity: boolean;      // Controls: new resources/events in communities you're a member of
  trust_recognition: boolean;       // Controls: trust points and level changes
  direct_messages: boolean;         // Direct 1:1 messages
  community_messages: boolean;      // Community chat messages
}

// Helper function to convert database preferences to grouped format
// Since the database now uses group-level columns, this is mostly a direct mapping
export const groupPreferences = (preferences: NotificationPreferences): GroupedNotificationPreferences => ({
  social_interactions: preferences.social_interactions ?? true,
  my_resources: preferences.my_resources ?? true,
  my_registrations: preferences.my_registrations ?? true,
  my_communities: preferences.my_communities ?? true,
  community_activity: preferences.community_activity ?? true,
  trust_recognition: preferences.trust_recognition ?? true,
  direct_messages: preferences.direct_messages ?? true,
  community_messages: preferences.community_messages ?? true,
});

// Helper function to flatten grouped preferences back to database format
// Since the database uses the same group-level structure, this is mostly a direct mapping
export const flattenPreferences = (grouped: Partial<GroupedNotificationPreferences>): Partial<NotificationPreferencesUpdate> => ({
  social_interactions: grouped.social_interactions,
  my_resources: grouped.my_resources,
  my_registrations: grouped.my_registrations,
  my_communities: grouped.my_communities,
  community_activity: grouped.community_activity,
  trust_recognition: grouped.trust_recognition,
  direct_messages: grouped.direct_messages,
  community_messages: grouped.community_messages,
});