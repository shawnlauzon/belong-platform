import { createClient } from 'supabase';
import webpush from 'web-push';

/**
 * Push Notification Edge Function
 *
 * This function is responsible ONLY for sending push notifications.
 * All business logic (preference checking, deciding what to send) happens in the
 * database trigger function (deliver_notification).
 *
 * Input: user_id, notification_id
 * Process:
 *   1. Fetch user's push subscriptions from push_subscriptions table
 *   2. Fetch notification details from notification_details view
 *   3. Generate title/body based on notification.action
 *   4. Send via Web Push Protocol
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface PushNotificationRequest {
  user_id: string;
  notification_id: string;
}

interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
}

interface ActorData {
  display_name?: string;
  full_name?: string;
  avatar_url?: string;
}

interface ResourceData {
  title?: string;
  type?: string;
  status?: string;
  voting_deadline?: string;
  image_url?: string;
  timeslot_start_time?: string;
  timeslot_end_time?: string;
}

interface CommentData {
  content_preview?: string;
}

interface ClaimData {
  status?: string;
  commitment_level?: 'none' | 'interested' | 'committed';
  timeslot_id?: string;
  timeslot_start_time?: string;
  timeslot_end_time?: string;
  resource_id?: string;
  resource_title?: string;
  resource_type?: string;
  claimant_id?: string;
  claimant_name?: string;
  owner_id?: string;
  owner_name?: string;
}

interface CommunityData {
  name?: string;
  time_zone?: string;
  icon?: string;
  color?: string;
  type?: string;
  description?: string;
  banner_image_url?: string;
}

interface NotificationDetail {
  id: string;
  action: string;
  resource_id?: string;
  comment_id?: string;
  claim_id?: string;
  community_id?: string;
  shoutout_id?: string;
  conversation_id?: string;
  actor_id?: string;
  created_at: string;

  // Typed data columns
  actor_data?: ActorData;
  resource_data?: ResourceData;
  comment_data?: CommentData;
  claim_data?: ClaimData;
  community_data?: CommunityData;

  // Simple columns
  changes?: string[];
  shoutout_message?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT');

    if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
      throw new Error('VAPID keys not configured');
    }

    // Configure web-push
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    // Parse request body
    const request: PushNotificationRequest = await req.json();
    const { user_id, notification_id } = request;

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(
      `Processing push notification for user ${user_id}, notification ${notification_id}`,
    );

    // Fetch notification details
    const { data: notification, error: notificationError } = await supabase
      .from('notification_details')
      .select('*')
      .eq('id', notification_id)
      .single();

    if (notificationError || !notification) {
      return new Response(
        JSON.stringify({
          sent: 0,
          failed: 0,
          removed: 0,
          reason: 'Notification not found',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }

    // Generate title and body based on action type
    const action = notification.action;
    const title = generatePushTitle(action);
    const body = generatePushBody(notification);

    // Get user's push subscriptions
    const { data: subscriptions, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user_id);

    if (subsError) {
      throw subsError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({
          sent: 0,
          failed: 0,
          removed: 0,
          reason: 'No subscriptions found',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }

    // Prepare push payload
    const payload = JSON.stringify({
      title,
      body,
      data: {
        notification_id,
        action,
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
        if (error && typeof error === 'object' && 'statusCode' in error) {
          const statusCode = (error as { statusCode: number }).statusCode;
          if (statusCode === 410) {
            // Remove expired subscription
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('id', subscription.id);
            removed++;
          } else {
            failed++;
          }
        } else {
          failed++;
        }

        console.error(
          `Failed to send push to subscription ${subscription.id}:`,
          error,
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Error in send-push-notification:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});

/**
 * Generate push notification title based on action type
 */
function generatePushTitle(action: string): string {
  switch (action) {
    case 'claim.created':
      return 'New claim on your resource';
    case 'claim.approved':
      return 'Your claim was approved';
    case 'claim.rejected':
      return 'Your claim was rejected';
    case 'claim.cancelled':
      return 'Claim cancelled';
    case 'claim.completed':
      return 'Claim completed';
    case 'resource.given':
      return 'Resource marked as given';
    case 'resource.received':
      return 'Resource confirmed received';
    case 'resource.commented':
      return 'New comment on your resource';
    case 'comment.replied':
      return 'New reply to your comment';
    case 'message.received':
      return 'New message';
    case 'shoutout.received':
      return 'You received a shoutout!';
    case 'member.joined':
      return 'New member joined';
    case 'member.left':
      return 'Member left';
    case 'resource.created':
      return 'New resource';
    case 'event.created':
      return 'New event';
    default:
      return 'Notification';
  }
}

/**
 * Generate push notification body based on notification details
 */
function generatePushBody(notification: NotificationDetail): string {
  return 'You have a new notification';
}
