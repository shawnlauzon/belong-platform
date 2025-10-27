import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../../shared/types/database";
import type { PushSubscription } from "../types/pushSubscription";

/**
 * Fetch all push subscriptions for a user
 */
export async function fetchPushSubscriptions(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<PushSubscription[]> {
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}
