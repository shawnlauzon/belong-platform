import type { Database } from "../../../shared/types/database";

/**
 * Push subscription database row
 */
export type PushSubscription =
  Database["public"]["Tables"]["push_subscriptions"]["Row"];

/**
 * Push subscription input data for creating a new subscription
 */
export interface PushSubscriptionInput {
  endpoint: string;
  p256dhKey: string;
  authKey: string;
  userAgent?: string;
}

/**
 * Push subscription insert type for database
 */
export type PushSubscriptionInsert =
  Database["public"]["Tables"]["push_subscriptions"]["Insert"];

/**
 * Push subscription update type for database
 */
export type PushSubscriptionUpdate =
  Database["public"]["Tables"]["push_subscriptions"]["Update"];
