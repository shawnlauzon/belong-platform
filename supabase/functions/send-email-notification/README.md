# Send Email Notification Edge Function

Sends email notifications via Postmark API when triggered by database events.

## Purpose

This Edge Function is called asynchronously by database triggers via `pg_net` whenever a notification is created. It checks user email preferences and sends transactional emails through Postmark's template system.

## Architecture

- **Trigger**: Database functions call `send_email_notification_async()` → calls this Edge Function via `pg_net.http_post()`
- **Preference Check**: Verifies user has email enabled globally and for the specific notification type
- **Template Rendering**: Uses Postmark templates to render emails with dynamic content
- **Deep Links**: Generates context-specific CTAs linking to resources, messages, events, etc.
- **Non-blocking**: Runs asynchronously; failures don't block notification creation

## Environment Variables

Required configuration (set in Supabase Edge Function Secrets):

```bash
# Postmark Configuration
POSTMARK_NOTIFICATION_SERVER_TOKEN=your_postmark_server_api_token
POSTMARK_NOTIFICATION_FROM_EMAIL=notifications@belong.network
POSTMARK_NOTIFICATION_TEMPLATE_ID=your_template_id_or_alias
POSTMARK_NOTIFICATION_MESSAGE_STREAM=notification-transaction-stream

# Application Configuration
VITE_APP_URL=https://app.belong.network

# Supabase (automatically provided)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Postmark Template Requirements

The Postmark template must accept these variables:

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `actor_name` | string | Person or system that triggered the notification | "John Smith" or "Juntos" |
| `notification_title` | string | Headline for the notification | "New comment on your resource" |
| `notification_body` | string | Description or preview text | "John said: 'This is great!'" |
| `notification_timestamp` | string | Absolute timestamp of when notification occurred | "January 15, 2025 at 3:45 PM" |
| `cta_text` | string | Call-to-action button text | "View Resource", "View Message" |
| `cta_url` | URL | Deep link to the relevant entity | `https://juntos.community/resources/123` |
| `manage_preferences_url` | URL | Link to notification settings | `https://juntos.community/settings/notifications` |

### Template Structure

Your Postmark template should include (following best practices):

1. **Minimal Header** - Small brand text only (no large logos)
2. **Actor & Timestamp** - `{{actor_name}}` and `{{notification_timestamp}}` (absolute, not relative)
3. **Title** - `{{notification_title}}` prominently displayed
4. **Full Body** - `{{notification_body}}` (show complete content, not just teaser)
5. **Primary CTA Button** - Prominent button with `{{cta_url}}` and `{{cta_text}}`
6. **Secondary Actions** - Text links for "View details" and preference management
7. **Footer** - Link to `{{manage_preferences_url}}` with text like "Manage Notification Preferences"

**From Name Format**: All emails are sent as "Juntos <notifications@juntos.community>". The actor who triggered the notification is displayed in the email body content.

## Request Format

The Edge Function expects this payload:

```json
{
  "user_id": "uuid",
  "notification_id": "uuid",
  "type": "resource.commented",
  "title": "New comment on your resource",
  "body": "Someone commented on your resource",
  "metadata": {
    "actor_id": "uuid",
    "resource_id": "uuid"
  }
}
```

## Response Format

```json
{
  "sent": 1
}
```

Or if skipped:

```json
{
  "sent": 0,
  "reason": "Email disabled for this type"
}
```

## Preference Logic

Emails are sent only if:

1. User has valid email address in `profiles` table
2. User's `notifications_enabled = true` (global master switch)
3. Notification type has `email: true` in user's preferences
4. Exception: `event.cancelled` always sends (critical notification)

## CTA URL Generation

The function generates context-specific deep links based on notification type:

- **Resources/Events** → `/resources/{resource_id}`
- **Messages** → `/messages/{conversation_id}`
- **Comments** → `/resources/{resource_id}#comment-{comment_id}`
- **Shoutouts** → `/shoutouts/{shoutout_id}`
- **Membership** → `/communities/{community_id}`
- **Default** → `/notifications`

## Error Handling

- Invalid Postmark configuration → Returns 500 with error message
- User preferences disabled → Returns 200 with `reason: "Email disabled"`
- No email address found → Returns 200 with `reason: "No email address found"`
- Postmark API errors → Logged to console, returns 200 with failure reason
- Function errors → Logged to console, returns 500

All errors are non-fatal to the database transaction that created the notification.

## Testing

### Local Testing

1. Set up environment variables in `.env.local`
2. Use Postmark's test API token
3. Trigger a notification in your local database
4. Check Postmark's activity log

### Test with cURL

```bash
curl -X POST http://localhost:54321/functions/v1/send-email-notification \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-uuid",
    "notification_id": "notification-uuid",
    "type": "resource.commented",
    "title": "Test Notification",
    "body": "This is a test",
    "metadata": {}
  }'
```

## Deployment

```bash
# Set secrets
supabase secrets set POSTMARK_NOTIFICATION_SERVER_TOKEN=your_token
supabase secrets set POSTMARK_NOTIFICATION_FROM_EMAIL=notifications@juntos.community
supabase secrets set POSTMARK_NOTIFICATION_TEMPLATE_ID=your_template_id
supabase secrets set POSTMARK_NOTIFICATION_MESSAGE_STREAM=notification-transaction-stream
supabase secrets set VITE_APP_URL=https://juntos.community

# Deploy function
supabase functions deploy send-email-notification
```

## Monitoring

- Check Postmark activity dashboard for delivery status
- Monitor Edge Function logs for errors
- Track `sent` vs `failed` counts in responses

## Related Files

- Database function: `supabase/migrations/20251030221439_add_email_notifications.sql`
- Push notification equivalent: `supabase/functions/send-push-notification/`
- Preference types: `src/features/notifications/types/notificationPreferences.ts`
