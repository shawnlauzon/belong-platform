import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Web Push library for sending push notifications
// Using the npm: specifier for Deno's node compatibility layer
import webpush from "npm:web-push@3.6.6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PushNotificationRequest {
  user_id: string;
  notification_id: string;
  type: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}

interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT");

    if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
      throw new Error("VAPID keys not configured");
    }

    // Configure web-push
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    // Parse request body
    const request: PushNotificationRequest = await req.json();
    const { user_id, notification_id, type, title, body, metadata } = request;

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user has push enabled and type is enabled
    const { data: preferences } = await supabase
      .from("notification_preferences")
      .select("push_enabled, " + `"${type}"`)
      .eq("user_id", user_id)
      .single();

    if (!preferences) {
      return new Response(
        JSON.stringify({
          sent: 0,
          failed: 0,
          removed: 0,
          reason: "No preferences found",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Check global push enabled
    if (!preferences.push_enabled) {
      return new Response(
        JSON.stringify({
          sent: 0,
          failed: 0,
          removed: 0,
          reason: "Push disabled globally",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Check type-specific preference (unless it's event.cancelled which always sends)
    if (type !== "event.cancelled") {
      const typePref = preferences[type] as { push?: boolean } | undefined;
      if (!typePref || typePref.push !== true) {
        return new Response(
          JSON.stringify({
            sent: 0,
            failed: 0,
            removed: 0,
            reason: "Push disabled for this type",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }
    }

    // Get user's push subscriptions
    const { data: subscriptions, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user_id);

    if (subsError) {
      throw subsError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({
          sent: 0,
          failed: 0,
          removed: 0,
          reason: "No subscriptions found",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Prepare push payload
    const payload = JSON.stringify({
      title,
      body,
      data: {
        notification_id,
        type,
        metadata: metadata || {},
      },
    });

    let sent = 0;
    let failed = 0;
    let removed = 0;

    // Send push notification to all subscriptions
    for (const subscription of subscriptions as PushSubscription[]) {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh_key,
            auth: subscription.auth_key,
          },
        };

        await webpush.sendNotification(pushSubscription, payload);
        sent++;
      } catch (error: unknown) {
        // Check if subscription is expired (410 Gone)
        if (error && typeof error === "object" && "statusCode" in error) {
          const statusCode = (error as { statusCode: number }).statusCode;
          if (statusCode === 410) {
            // Remove expired subscription
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("id", subscription.id);
            removed++;
          } else {
            failed++;
          }
        } else {
          failed++;
        }

        console.error(
          `Failed to send push to subscription ${subscription.id}:`,
          error
        );
      }
    }

    return new Response(
      JSON.stringify({
        sent,
        failed,
        removed,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in send-push-notification:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
