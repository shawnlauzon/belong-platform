import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../../shared/types/database";
import type { NotificationPreferencesUpdate } from "../types/notificationPreferences";

/**
 * Update notification preferences for the current user
 * Can update global switches and/or specific notification type preferences
 */
export async function updatePreferences(
  supabase: SupabaseClient<Database>,
  preferences: NotificationPreferencesUpdate
): Promise<void> {
  // Get current user ID
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { error } = await supabase
    .from("notification_preferences")
    .update(preferences)
    .eq("user_id", user.id);

  if (error) {
    throw error;
  }
}
