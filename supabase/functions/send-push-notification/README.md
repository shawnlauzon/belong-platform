# Send Push Notification Edge Function

Supabase Edge Function for sending Web Push notifications to users' devices.

## Overview

This Edge Function is called by database triggers when notifications are created. It:
1. Checks user's notification preferences
2. Retrieves user's push subscriptions
3. Sends push notifications via Web Push API
4. Automatically removes expired subscriptions (410 Gone responses)

## Setup & Deployment

### Step 1: Generate VAPID Keys

Use the `web-push` npm package to generate VAPID keys:

```bash
npx web-push generate-vapid-keys
```

This will output:
```
=======================================

Public Key:
BNxXX...

Private Key:
XXxXX...

=======================================
```

**Save both keys** - you'll need them for the next step.

### Step 2: Set Environment Variables

#### For Local Development

Add to your `.env` file:
```bash
VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_SUBJECT=mailto:your-email@example.com
```

#### For Production

Set via Supabase CLI:
```bash
pnpx supabase secrets set VAPID_PUBLIC_KEY=your_public_key_here
pnpx supabase secrets set VAPID_PRIVATE_KEY=your_private_key_here
pnpx supabase secrets set VAPID_SUBJECT=mailto:your-email@example.com
```

Or via Supabase Dashboard:
1. Go to Project Settings > Edge Functions
2. Add the environment variables

### Step 3: Deploy the Edge Function

Deploy the function to Supabase:
```bash
pnpx supabase functions deploy send-push-notification
```

### Step 4: Run Database Migration

Apply the push notification migration to your database:
```bash
pnpx supabase db push
```

### Step 5: Verify Deployment

Test that the function is deployed and accessible:
```bash
curl https://your-project-ref.supabase.co/functions/v1/send-push-notification \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test-uuid",
    "notification_id": "test-uuid",
    "type": "resource.commented",
    "title": "Test",
    "body": "Test notification"
  }'
```

You should receive a JSON response with `sent`, `failed`, and `removed` counts.

---

## Environment Variables Reference

The following environment variables are required:

- `VAPID_PUBLIC_KEY` - VAPID public key for Web Push (generated in Step 1)
- `VAPID_PRIVATE_KEY` - VAPID private key for Web Push (generated in Step 1)
- `VAPID_SUBJECT` - Contact URL or mailto: (e.g., `mailto:admin@example.com`)
- `SUPABASE_URL` - Auto-provided by Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-provided by Supabase

## Testing

Test the function locally:
```bash
pnpx supabase functions serve send-push-notification
```

Then send a test request:
```bash
curl -X POST http://localhost:54321/functions/v1/send-push-notification \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-uuid",
    "notification_id": "notification-uuid",
    "type": "resource.commented",
    "title": "New Comment",
    "body": "Someone commented on your resource"
  }'
```

## Request Payload

```typescript
{
  user_id: string;          // User to send notification to
  notification_id: string;  // Notification ID for tracking
  type: string;             // Notification type (e.g., 'resource.commented')
  title: string;            // Push notification title
  body: string;             // Push notification body
  metadata?: object;        // Optional metadata
}
```

## Response

```typescript
{
  sent: number;      // Number of pushes successfully sent
  failed: number;    // Number of pushes that failed
  removed: number;   // Number of expired subscriptions removed
  reason?: string;   // Reason if no pushes were sent
}
```

## Error Handling

- **410 Gone**: Subscription expired → automatically removed from database
- **Other errors**: Logged but don't fail the function
- **Missing preferences**: Returns success with `sent: 0`
- **Push disabled**: Returns success with reason

## Special Cases

- `event.cancelled` notifications **always send** if `push_enabled=true` (critical notification)
- All other types respect per-type push preferences
- Global `push_enabled` switch must be true for any push

## Dependencies

- `web-push@3.6.6` - Web Push protocol implementation
- `@supabase/supabase-js@2` - Supabase client for database queries

## Database Tables Used

- `notification_preferences` - User's notification preferences
- `push_subscriptions` - User's device push subscriptions
