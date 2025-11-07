import { createClient } from 'supabase';

/**
 * Email Notification Edge Function
 *
 * This function is responsible ONLY for formatting and sending email notifications.
 * All business logic (preference checking, deciding what to send) happens in the
 * database trigger function (deliver_notification).
 *
 * Input: user_id, notification_id
 * Process:
 *   1. Fetch user email from profiles table
 *   2. Fetch notification details from notification_details view
 *   3. Format email using notification.action to determine template
 *   4. Send via Postmark API
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface EmailNotificationRequest {
  user_id: string;
  notification_id: string;
}

interface PostmarkTemplateRequest {
  From: string;
  To: string;
  TemplateId?: number;
  TemplateAlias?: string;
  TemplateModel: {
    subject: string;
    actor_display_name: string;
    actor_full_name: string;
    actor_avatar_url: string;
    actor_operation: string;
    notification_title?: string;
    timeslot?: string;
    sent_to: string;
    actions: {
      name: string;
      url: string;
    }[];
    details_url: string;
    manage_preferences_url: string;
  };
  TrackOpens: boolean;
  TrackLinks: string;
  MessageStream: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const postmarkToken = Deno.env.get('POSTMARK_NOTIFICATION_SERVER_TOKEN');
    const postmarkFrom = Deno.env.get('POSTMARK_NOTIFICATION_FROM_EMAIL');
    const postmarkTemplateId = Deno.env.get(
      'POSTMARK_NOTIFICATION_TEMPLATE_ID',
    );
    const postmarkMessageStream = Deno.env.get(
      'POSTMARK_NOTIFICATION_MESSAGE_STREAM',
    );
    const appUrl = Deno.env.get('VITE_APP_URL');

    if (
      !postmarkToken ||
      !postmarkFrom ||
      !postmarkTemplateId ||
      !postmarkMessageStream ||
      !appUrl
    ) {
      throw new Error('Postmark configuration incomplete');
    }

    // Parse request body
    const request: EmailNotificationRequest = await req.json();
    const { user_id, notification_id } = request;

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(
      `Processing email notification for user ${user_id}, notification ${notification_id}`,
    );

    // Get user's email from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user_id)
      .single();

    if (profileError || !profile?.email) {
      return new Response(
        JSON.stringify({
          sent: 0,
          reason: 'No email address found',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }

    // Fetch notification details to get all entity IDs
    const { data: notification } = await supabase
      .from('notification_details')
      .select('*')
      .eq('id', notification_id)
      .single();

    console.log(
      `Found notification ${notification_id}:`,
      JSON.stringify(notification),
    );

    if (!notification) {
      return new Response(
        JSON.stringify({
          sent: 0,
          reason: 'Notification not found',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }

    const { actor_data } = notification;
    const actor_full_name = actor_data?.full_name || 'Someone';

    // Prepare Postmark template request
    const postmarkRequest: PostmarkTemplateRequest = {
      From: `${actor_full_name} via Juntos <${postmarkFrom}>`,
      To: profile.email,
      TemplateAlias: 'app-notification',
      TemplateModel: createEmailTemplateModel(notification, appUrl),
      TrackOpens: true,
      TrackLinks: 'HtmlOnly',
      MessageStream: postmarkMessageStream,
    };

    console.log('Sending to Postmark: ', JSON.stringify(postmarkRequest));

    // Send email via Postmark API
    const postmarkResponse = await fetch(
      'https://api.postmarkapp.com/email/withTemplate',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Postmark-Server-Token': postmarkToken,
        },
        body: JSON.stringify(postmarkRequest),
      },
    );

    if (!postmarkResponse.ok) {
      const errorBody = await postmarkResponse.text();
      console.error('Postmark API error:', postmarkResponse.status, errorBody);
      return new Response(
        JSON.stringify({
          sent: 0,
          reason: `Postmark API error: ${postmarkResponse.status}`,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }

    console.log('Email response', JSON.stringify(postmarkResponse));

    return new Response(
      JSON.stringify({
        sent: 1,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Error in send-email-notification:', error);
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

interface Notification {
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
  commitment_level?: string;
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

interface NotificationDetail extends Notification {
  // Typed data columns
  actor_data?: ActorData;
  resource_data?: ResourceData;
  comment_data?: CommentData;
  claim_data?: ClaimData;

  // Simple columns
  changes?: string[];
  community_name?: string;
  shoutout_message?: string;
}

/**
 * Creates the email template model from notification details
 */
function createEmailTemplateModel(
  notification: NotificationDetail,
  appUrl: string,
): PostmarkTemplateRequest['TemplateModel'] {
  const { resource_id, actor_data, resource_data } = notification;
  const timeslot_start_time = resource_data?.timeslot_start_time;
  const actor_display_name = actor_data?.display_name || 'Someone';
  const actor_full_name = actor_data?.full_name || 'Someone';
  const actor_avatar_url = actor_data?.avatar_url;

  const operation = actorOperation(notification);
  const title = notificationTitle(notification);
  const subject = title
    ? `${actor_display_name} ${operation}: ${title}`
    : `${actor_display_name} ${operation}`;

  return {
    subject,
    actor_display_name,
    actor_full_name,
    actor_avatar_url,
    actor_operation: operation,
    notification_title: title,
    timeslot: formatEventTimestamp(timeslot_start_time),
    sent_to: sentTo(notification),
    actions: actions(notification, appUrl),
    details_url: `${appUrl}/events/${resource_id}`,
    manage_preferences_url: `${appUrl}/notifications/settings`,
  };
}

function formatEventTimestamp(isoString?: string): string | undefined {
  if (!isoString) {
    return undefined;
  }

  const date = new Date(isoString);

  // Format: "January 15, 2025 at 3:45 PM"
  const options: Intl.DateTimeFormatOptions = {
    dateStyle: 'full',
    timeStyle: 'short',
  };

  return date.toLocaleString('en-US', options);
}

function actions(notification: NotificationDetail, appUrl: string) {
  switch (notification.action) {
    case 'resource.created':
      return [
        {
          name: 'View Resource',
          url: `${appUrl}/resources/${notification.resource_id}`,
        },
      ];
    case 'event.created':
      return [
        {
          name: 'Accept',
          url: `${appUrl}/events/${notification.resource_id}`,
        },
        {
          name: 'Decline',
          url: `${appUrl}/events/${notification.resource_id}`,
        },
      ];
    case 'claim.created':
      return [
        {
          name: 'View Claim',
          url: `${appUrl}/claims/${notification.claim_id}`,
        },
      ];
    default:
      return [];
  }
}

function actorOperation(notification: NotificationDetail): string {
  const action = notification.action;
  const resourceType = notification.resource_data?.type;

  // Resource and event actions
  if (action === 'resource.created') {
    return 'shared a resource';
  }
  if (action === 'event.created') {
    return 'posted a new event';
  }
  if (action.startsWith('event.')) {
    return 'updated an event';
  }
  if (action.startsWith('resource.')) {
    return 'updated a resource';
  }

  // Claim actions - differentiate between offers and requests
  if (action === 'claim.created') {
    if (resourceType === 'offer') {
      return 'accepted your offer';
    } else if (resourceType === 'request') {
      return 'offered to help';
    }
    return 'responded to your resource';
  }
  if (action === 'claim.approved') {
    if (resourceType === 'offer') {
      return 'confirmed your meetup time';
    } else if (resourceType === 'request') {
      return 'accepted your offer to help';
    }
    return 'approved your response';
  }
  if (action === 'claim.rejected') {
    return "can't make the time you proposed";
  }
  if (action.startsWith('claim.')) {
    return 'updated a response';
  }

  // Comment actions
  if (action.startsWith('comment.')) {
    return 'commented';
  }

  // Message actions
  if (action.startsWith('message.') || action.startsWith('conversation.')) {
    return 'sent you a message';
  }

  // Shoutout actions
  if (action === 'shoutout.created') {
    return 'gave you a shoutout';
  }
  if (action.startsWith('shoutout.')) {
    return 'updated a shoutout';
  }

  // Membership actions
  if (action === 'membership.approved') {
    return 'approved your membership';
  }
  if (action === 'membership.rejected') {
    return 'declined your membership';
  }
  if (action.startsWith('membership.')) {
    return 'updated your membership';
  }

  // Default fallback
  return 'performed an action';
}

function notificationTitle(notification: NotificationDetail): string | undefined {
  const { action, resource_data, community_name } = notification;
  const resource_title = resource_data?.title;

  switch (action) {
    // Resource and event notifications - use resource title
    case 'resource.created':
    case 'resource.updated':
    case 'resource.expiring':
    case 'resource.given':
    case 'resource.received':
    case 'resource.commented':
    case 'event.created':
    case 'event.updated':
    case 'event.cancelled':
    case 'event.starting':
    case 'claim.created':
    case 'claim.approved':
    case 'claim.rejected':
    case 'claim.cancelled':
    case 'claim.completed':
      return resource_title;

    // Comment replies - use resource title
    case 'comment.replied':
      return resource_title;

    // Membership changes - use community name
    case 'member.joined':
    case 'member.left':
      return community_name;

    // Message/conversation - no title
    case 'message.received':
    case 'conversation.requested':
      return undefined;

    // These don't need additional title detail
    case 'shoutout.received':
    case 'trustlevel.changed':
    case 'connection.accepted':
    default:
      return undefined;
  }
}

function sentTo(notification: NotificationDetail): string {
  const { action, community_name } = notification;

  switch (action) {
    // New resource/event notifications - sent to all community members
    case 'resource.created':
    case 'event.created':
      return `members of the ${community_name || 'community'}`;

    // Claim notifications - sent to specific individuals
    case 'claim.created':
      return 'only you, the resource owner';
    case 'claim.approved':
    case 'claim.rejected':
    case 'claim.cancelled':
    case 'claim.completed':
      return 'only you';

    // Resource handoff notifications - sent to the other party
    case 'resource.given':
    case 'resource.received':
      return 'only you';

    // Resource update/cancellation - sent to claimants
    case 'resource.updated':
    case 'event.updated':
    case 'event.cancelled':
      return 'you and others who registered';

    // Comment notifications
    case 'resource.commented':
      return 'you, the resource owner';
    case 'comment.replied':
      return 'you, the comment author';

    // Message notifications
    case 'message.received':
      return 'you and other conversation participants';
    case 'conversation.requested':
      return 'only you';

    // Shoutout notifications
    case 'shoutout.received':
      return 'only you';

    // Membership notifications - sent to admins
    case 'member.joined':
    case 'member.left':
      return `community admins of ${community_name || 'the community'}`;

    // Scheduled reminders
    case 'resource.expiring':
      return 'you and active claimants';
    case 'event.starting':
      return 'you and registered attendees';

    // Trust score and connections
    case 'trustlevel.changed':
      return 'only you';
    case 'connection.accepted':
      return 'only you';

    // Default fallback
    default:
      return 'you';
  }
}

/**
 * Generate CTA text and URL based on notification
 */
function generateCTA(
  notification: Notification,
  appUrl: string,
): { ctaText: string; ctaUrl: string } {
  const action = notification.action;

  // Default fallback
  let ctaText = 'View Notification';
  let ctaUrl = `${appUrl}/notifications`;

  // Generate specific CTAs based on notification action
  if (
    action.includes('resource.') ||
    action.includes('event.') ||
    action.includes('claim.')
  ) {
    if (notification.resource_id) {
      ctaText = action.includes('event.') ? 'View Event' : 'View Resource';
      ctaUrl = `${appUrl}/resources/${notification.resource_id}`;
    }
  } else if (action.includes('message.') || action.includes('conversation.')) {
    if (notification.conversation_id) {
      ctaText = 'View Conversation';
      ctaUrl = `${appUrl}/messages/${notification.conversation_id}`;
    }
  } else if (action.includes('comment.')) {
    if (notification.resource_id) {
      ctaText = 'View Comment';
      ctaUrl = `${appUrl}/resources/${notification.resource_id}${
        notification.comment_id ? `#comment-${notification.comment_id}` : ''
      }`;
    }
  } else if (action.includes('shoutout.')) {
    if (notification.shoutout_id) {
      ctaText = 'View Shoutout';
      ctaUrl = `${appUrl}/shoutouts/${notification.shoutout_id}`;
    }
  } else if (action.includes('membership.')) {
    if (notification.community_id) {
      ctaText = 'View Community';
      ctaUrl = `${appUrl}/communities/${notification.community_id}`;
    }
  }

  return { ctaText, ctaUrl };
}
