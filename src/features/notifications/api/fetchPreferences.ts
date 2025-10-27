import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../../shared/types/database";
import type {
  NotificationPreferences,
  TypedNotificationPreferences,
} from "../types/notificationPreferences";
import { toTypedPreferences } from "../types/notificationPreferences";

/**
 * Fetch notification preferences for a user
 * Returns the raw database row
 */
export async function fetchPreferences(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<NotificationPreferences | null> {
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Fetch typed notification preferences for a user
 * Returns the preferences with parsed JSONB channel settings
 */
export async function fetchTypedPreferences(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<TypedNotificationPreferences | null> {
  const prefs = await fetchPreferences(supabase, userId);

  if (!prefs) {
    return null;
  }

  return toTypedPreferences(prefs);
}
