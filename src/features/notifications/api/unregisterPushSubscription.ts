import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../../shared/types/database";

/**
 * Unregister a push subscription by ID
 */
export async function unregisterPushSubscription(
  supabase: SupabaseClient<Database>,
  subscriptionId: string
): Promise<void> {
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("id", subscriptionId);

  if (error) {
    throw error;
  }
}
