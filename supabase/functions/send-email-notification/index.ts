import { createClient } from 'supabase';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const notificationTemplates = {
  'event.created': {
    templateId: 42024291,
    subject: 'New Event Created',
    body: 'A new event has been created by {actor_name}. Would you like to attend?',
  },
};

interface EmailNotificationRequest {
  user_id: string;
  notification_id: string;
  type: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}

interface PostmarkTemplateRequest {
  From: string;
  To: string;
  TemplateId: string | number;
  TemplateModel: {
    actor_name: string;
    notification_title: string;
    notification_body: string;
    notification_timestamp: string;
    sent_to: string;
    cta_text: string;
    cta_url: string;
    manage_preferences_url: string;
  };
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
    const { user_id, notification_id, type } = request;

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Checking preferences for user ${user_id} and type ${type}`);

    // Check if user has notifications enabled and type is enabled
    const { data: preferences } = await supabase
      .from('notification_preferences')
      .select('notifications_enabled, ' + `"${type}"`)
      .eq('user_id', user_id)
      .single();

    if (!preferences) {
      return new Response(
        JSON.stringify({
          sent: 0,
          reason: 'No preferences found',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }

    console.log('Notifications enabled:', preferences.notifications_enabled);
    console.log(`${type} enabled:`, JSON.stringify(preferences[type]));

    // Check global notifications enabled
    if (!preferences.notifications_enabled) {
      return new Response(
        JSON.stringify({
          sent: 0,
          reason: 'Notifications disabled globally',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }

    const typePref = preferences[type] as { email?: boolean } | undefined;
    if (!typePref || typePref.email !== true) {
      return new Response(
        JSON.stringify({
          sent: 0,
          reason: 'Email disabled for this type',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }

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

    const {
      action,
      actor_display_name,
      actor_avatar_url,
      resource_title,
      resource_type,
      community_name,
      shoutout_message,
      claim_details,
      metadata,
    } = notification;

    // Generate CTA URL and text based on notification
    const { ctaText, ctaUrl } = generateCTA(notification, appUrl);

    // Format timestamp
    const notificationTimestamp = formatTimestamp(notification.created_at);

    const { timeslot_start_time, resource_status, voting_deadline } = metadata;

    // Prepare Postmark template request
    const postmarkRequest: PostmarkTemplateRequest = {
      From: `${actor_display_name} via Juntos <${postmarkFrom}>`,
      To: profile.email,
      TemplateId: postmarkTemplateId,
      TemplateModel: {
        subject: 'A new event has been created',
        actor_name: actor_display_name,
        notification_timestamp: notificationTimestamp,
        event_timestamp: formatEventTimestamp(timeslot_start_time),
        sent_to: `members of the ${community_name} community`,
        cta_url: ctaUrl,
        resource_title,
        details_url: `${appUrl}/events/${resource_id}`,
        manage_preferences_url: `${appUrl}/notifications/settings`,
      },
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
          'X-PM-Message-Stream': postmarkMessageStream,
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

/**
 * Format timestamp as absolute date/time for email
 */
function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);

  // Format: "January 15, 2025 at 3:45 PM"
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };

  return date.toLocaleString('en-US', options);
}

function formatEventTimestamp(isoString: string): string {
  const date = new Date(isoString);

  // Format: "January 15, 2025 at 3:45 PM"
  const options: Intl.DateTimeFormatOptions = {
    dateStyle: 'full',
    timeStyle: 'short',
  };

  return date.toLocaleString('en-US', options);
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
