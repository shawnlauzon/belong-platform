import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../../shared/types/database";
import type {
  PushSubscription,
  PushSubscriptionInput,
} from "../types/pushSubscription";

/**
 * Register a new push subscription for the current user
 */
export async function registerPushSubscription(
  supabase: SupabaseClient<Database>,
  subscription: PushSubscriptionInput
): Promise<PushSubscription> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User must be authenticated to register push subscription");
  }

  const { data, error } = await supabase
    .from("push_subscriptions")
    .insert({
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh_key: subscription.p256dhKey,
      auth_key: subscription.authKey,
      user_agent: subscription.userAgent,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
