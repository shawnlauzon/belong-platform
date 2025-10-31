# Notifications

Multi-channel notification system with push and email delivery, dual confirmation, and granular per-type preferences.

## Purpose

The notifications feature provides:

- Real-time notifications for platform activities
- Action-based architecture with granular event tracking
- Multi-channel delivery: in-app, push notifications, and email
- User-configurable preferences per notification type per channel
- Unread count tracking
- Read/unread status management
- Type-safe metadata for each notification type
- Push notification support via Web Push API
- Email notification support via Postmark API
- Dual confirmation system for transactions

## Architecture

The notification system uses an **action-based architecture** that separates what happened from how users control notifications:

### Actions vs Notification Types

- **Actions** = Granular events that actually occurred (e.g., `member.joined`, `claim.approved`, `claim.rejected`)
- **Notification Types** = User-facing preference categories that group related actions (e.g., `membership.updated`, `claim.responded`)

### Why This Separation?

This architecture provides:

1. **Granular event tracking** - Know exactly what happened (`member.joined` vs `member.left`)
2. **Simplified user preferences** - Users control broader categories instead of dozens of individual toggles
3. **Flexibility** - Add new granular actions without changing user preferences
4. **Decoupling** - Trust score system and notifications can independently track the same actions

### Mapping Table

The `action_to_notification_type_mapping` table links actions to notification types:

```sql
action (action_type)     → notification_type (TEXT)
'member.joined'          → 'membership.updated'
'member.left'            → 'membership.updated'
'claim.approved'         → 'claim.responded'
'claim.rejected'         → 'claim.responded'
'resource.created'       → 'resource.created'  -- 1:1 mapping
```

### How It Works

1. User performs action → Database trigger fires
2. Trigger creates notification with `action` field (e.g., `member.joined`)
3. Trigger looks up notification type from mapping table (e.g., `membership.updated`)
4. Trigger checks user preferences for that notification type
5. If enabled, notification is created and/or push sent

## Key Entities

### Notification

Main notification entity with polymorphic references.

**Key Fields:**

- `id` - Notification ID
- `userId` - Recipient user ID
- `action` - Action type that triggered this notification (e.g., `member.joined`, `claim.approved`)
- `resourceId` - Optional resource reference
- `commentId` - Optional comment reference
- `claimId` - Optional claim reference
- `communityId` - Optional community reference
- `shoutoutId` - Optional shoutout reference
- `conversationId` - Optional conversation reference
- `actorId` - User who triggered the notification (null for system notifications)
- `metadata` - Action-specific additional data
- `readAt` - When notification was read (null if unread)
- `createdAt`, `updatedAt` - Timestamps

**Notes:**

- Stores the **granular action** that occurred, not the notification type
- Polymorphic design supports multiple entity types
- Metadata structure varies by action type
- Uses database triggers for automatic creation
- Push notifications sent asynchronously via Edge Functions
- Actions are mapped to notification types for preference checking

### NotificationPreferences

Per-type, per-channel notification preferences stored in separate table. Preferences are organized by **notification types**, not individual actions.

**Structure:**

- One row per user
- One JSONB column per **notification type** (user-facing categories)
- Each JSONB contains: `{"in_app": bool, "push": bool, "email": bool}`
- Global switches: `push_enabled`, `email_enabled`

**Key Fields:**

- `userId` - User ID
- `membership_updated` - JSONB preferences (controls `member.joined` and `member.left` actions)
- `claim_responded` - JSONB preferences (controls `claim.approved` and `claim.rejected` actions)
- `resource_commented` - JSONB preferences (controls `resource.commented` action)
- `comment_replied` - JSONB preferences
- `claim_created` - JSONB preferences
- ... (notification types, see mapping table for action→type relationships)
- `push_enabled` - Global push master switch (default: false)
- `email_enabled` - Global email master switch (default: false)

**Notes:**

- Preferences control **notification types**, which may map to multiple actions
- All notifications default to enabled (true) for all channels
- User must explicitly enable `push_enabled` to receive ANY push notifications
- Critical notifications (e.g., `event.cancelled`) have preferences but UI does not expose toggles
- JSONB design allows future channel additions without schema changes
- Adding new actions doesn't require changing preferences if they map to existing types

### PushSubscription

Web Push subscription endpoints for push notification delivery.

**Key Fields:**

- `id` - Subscription ID
- `userId` - User ID
- `endpoint` - Push service endpoint URL
- `p256dhKey` - Encryption key for push payload
- `authKey` - Authentication secret
- `userAgent` - Browser/device identifier (optional)
- `createdAt`, `updatedAt` - Timestamps

**Notes:**

- One user can have multiple subscriptions (multiple devices)
- Unique constraint on `(user_id, endpoint)`
- Invalid subscriptions automatically cleaned up on 410 Gone responses

## Core Concepts

### Actions and Notification Types

The system uses two parallel type systems:

1. **Actions** (`action_type` enum) - Granular events (e.g., `member.joined`, `claim.approved`)
2. **Notification Types** (preference columns) - User-facing categories (e.g., `membership.updated`, `claim.responded`)

**Actions are stored in notifications**, **notification types control preferences**.

### Action Catalog

Below are the actions grouped by their notification type mappings:

#### Comments (2)

- `resource.commented` - Someone commented on your resource → Resource owner
- `comment.replied` - Someone replied to your comment → Comment author

#### Claims

**Notification Type: `claim.created`** (1:1 mapping)
- **Action**: `claim.created` - Someone claimed your resource → Resource owner

**Notification Type: `claim.cancelled`** (1:1 mapping)
- **Action**: `claim.cancelled` - Someone cancelled their claim → Resource owner

**Notification Type: `claim.responded`** (many-to-one mapping)
- **Action**: `claim.approved` - Owner approved your claim → Claimant
- **Action**: `claim.rejected` - Owner rejected your claim → Claimant
- Metadata includes: `{"response": "approved" | "rejected"}`

#### Transaction Confirmation (2 - Dual System)

- `resource.given` - Other party marked as given, confirm you received → **Receiver**
  - Favor: Claimant gives help → Owner receives (owner gets notification)
  - Offer: Owner gives item → Claimant receives (claimant gets notification)
- `resource.received` - Other party marked as received, confirm you gave → **Giver**
  - Favor: Owner marks received → Claimant confirms gave (claimant gets notification)
  - Offer: Claimant marks received → Owner confirms gave (owner gets notification)

**Dual Confirmation Flow:**
Both parties must independently confirm the transaction. Either party can initiate by marking "given" or "received", and the other party must confirm.

#### Resources & Events (6)

- `resource.created` - New resource in community → Community members
- `event.created` - New event in community → Community members
- `resource.updated` - Resource you claimed was updated → Active claimants
- `event.updated` - Event you claimed was updated → Active claimants
- `event.cancelled` - Event you claimed was cancelled → Active claimants
  - **Note**: Has separate preference but UI does not expose toggle (defaults to enabled for critical notifications)
- `resource.expiring` - Your resource expiring soon → Resource owner
- `event.starting` - Event starting soon → Event owner + Active claimants

#### Social

**Notification Type: `message.received`** (1:1 mapping)
- **Action**: `message.received` - You received a message → Conversation participant

**Notification Type: `conversation.requested`** (1:1 mapping)
- **Action**: `conversation.requested` - Someone requested to chat → Other participant

**Notification Type: `shoutout.received`** (1:1 mapping)
- **Action**: `shoutout.received` - You received a shoutout → Shoutout receiver

**Notification Type: `membership.updated`** (many-to-one mapping)
- **Action**: `member.joined` - Member joined your community → Organizers/founders
- **Action**: `member.left` - Member left your community → Organizers/founders
- Metadata includes: `{"action": "joined" | "left"}`

#### System (1)

- `trustlevel.changed` - Your trust level changed → User

### Notification Channels

Each notification type supports multiple delivery channels:

1. **In-App** - Shown in notification center (default: ON)
2. **Push** - Web Push API notifications (default: ON, requires `notifications_enabled=true`)
3. **Email** - Email via Postmark (default: ON except messages, requires `notifications_enabled=true`)

**Channel Logic:**

```
Send in-app IF:
  notification_preferences->'type'->>'in_app' = 'true'

Send push IF:
  notifications_enabled = true
  AND notification_preferences->'type'->>'push' = 'true'

Send email IF:
  notifications_enabled = true
  AND notification_preferences->'type'->>'email' = 'true'
  AND user has valid email address
```

**Note**:
- Critical notification types like `event.cancelled` have preferences in the database but are not exposed in the UI, ensuring they remain enabled by default.
- Direct messages (`message.received`) have email disabled by default to avoid notification overload.

### Metadata

Each notification type has specific metadata:

- **ClaimResponseMetadata** - `{"response": "approved" | "rejected"}`
- **MembershipMetadata** - `{"action": "joined" | "left"}`
- **ResourceUpdatedMetadata** - `{"changes": ["title", "description", ...]}`
- **TrustLevelMetadata** - `{"old_level": number, "new_level": number}`
- **CommentMetadata** - `{"content_preview": string}`

### Unread Counts

System tracks unread notifications:

- Per-user unread count
- Real-time updates via database triggers
- Efficient counting queries

## API Reference

### Hooks - Notifications

- `useNotifications(filter?)` - Query notifications with optional filters
- `useNotificationUnreadCount()` - Get unread count for current user
- `useMarkAsRead()` - Mark notification(s) as read

### Hooks - Preferences

- `useNotificationPreferences()` - Get user's notification preferences (all types)
- `useUpdateNotificationPreferences()` - Update preference settings for specific types

### Hooks - Push Subscriptions

- `usePushSubscriptions()` - Get user's push subscriptions (all devices)
- `useRegisterPushSubscription()` - Register new device for push notifications
- `useUnregisterPushSubscription()` - Remove device from push notifications

### Key Functions - Notifications

- `fetchNotifications(supabase, filter)` - Fetch notifications
- `fetchUnreadCount(supabase, userId)` - Get unread count
- `markAsRead(supabase, notificationIds)` - Mark as read

### Key Functions - Preferences

- `fetchNotificationPreferences(supabase, userId)` - Fetch user preferences
- `updateNotificationPreferences(supabase, userId, updates)` - Update preferences

### Key Functions - Push Subscriptions

- `registerPushSubscription(supabase, subscription)` - Register push subscription
- `unregisterPushSubscription(supabase, subscriptionId)` - Remove push subscription
- `fetchPushSubscriptions(supabase, userId)` - Get user's subscriptions

## Important Patterns

### Querying Notifications

```typescript
// Get all notifications for current user
const { data: notifications } = useNotifications();

// Get unread count
const { data: unreadCount } = useNotificationUnreadCount();

// Filter by type
const { data: commentNotifs } = useNotifications({
  types: ['resource.commented', 'comment.replied'],
});
```

### Marking as Read

```typescript
const markAsRead = useMarkAsRead();

// Mark single notification
await markAsRead.mutateAsync([notificationId]);

// Mark multiple
await markAsRead.mutateAsync(notificationIds);
```

### Notification Preferences

```typescript
// Get all preferences
const { data: prefs } = useNotificationPreferences();

// Update specific notification type preferences
const updatePrefs = useUpdateNotificationPreferences();
await updatePrefs.mutateAsync({
  resource_commented: {
    in_app: true,
    push: true,
    email: false,
  },
});

// Enable push notifications globally (required for ANY push)
await updatePrefs.mutateAsync({
  push_enabled: true,
});
```

### Push Subscriptions

```typescript
// Get user's devices
const { data: subscriptions } = usePushSubscriptions();

// Register new device for push notifications
const register = useRegisterPushSubscription();

// 1. Request permission from browser
const permission = await Notification.requestPermission();
if (permission !== 'granted') return;

// 2. Subscribe to push service
const registration = await navigator.serviceWorker.ready;
const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: VAPID_PUBLIC_KEY,
});

// 3. Register with backend
await register.mutateAsync({
  endpoint: subscription.endpoint,
  p256dhKey: arrayBufferToBase64(subscription.getKey('p256dh')),
  authKey: arrayBufferToBase64(subscription.getKey('auth')),
  userAgent: navigator.userAgent,
});

// Unregister device
const unregister = useUnregisterPushSubscription();
await unregister.mutateAsync(subscriptionId);
```

### Polymorphic References

Notifications reference different entities based on type:

```typescript
if (notification.resourceId) {
  // Fetch resource
}
if (notification.commentId) {
  // Fetch comment
}
if (notification.conversationId) {
  // Fetch conversation
}
```

### Dual Confirmation Pattern

```typescript
// Check if transaction needs confirmation
const needsConfirmation =
  notification.type === 'resource.given' ||
  notification.type === 'resource.received';

if (needsConfirmation) {
  // Show confirmation UI
  // User clicks "Confirm" → update claim status
  // This triggers the reciprocal notification to other party
}
```

## Database Schema

### notification_preferences Table

```sql
CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,

  -- 19 notification type columns (JSONB)
  resource_commented JSONB DEFAULT '{"in_app": true, "push": true, "email": false}',
  comment_replied JSONB DEFAULT '{"in_app": true, "push": true, "email": false}',
  claim_created JSONB DEFAULT '{"in_app": true, "push": true, "email": false}',
  claim_cancelled JSONB DEFAULT '{"in_app": true, "push": true, "email": false}',
  claim_responded JSONB DEFAULT '{"in_app": true, "push": true, "email": false}',
  resource_given JSONB DEFAULT '{"in_app": true, "push": true, "email": false}',
  resource_received JSONB DEFAULT '{"in_app": true, "push": true, "email": false}',
  resource_created JSONB DEFAULT '{"in_app": true, "push": true, "email": false}',
  event_created JSONB DEFAULT '{"in_app": true, "push": true, "email": false}',
  resource_updated JSONB DEFAULT '{"in_app": true, "push": true, "email": false}',
  event_updated JSONB DEFAULT '{"in_app": true, "push": true, "email": false}',
  event_cancelled JSONB DEFAULT '{"in_app": true, "push": true, "email": false}',
  resource_expiring JSONB DEFAULT '{"in_app": true, "push": true, "email": false}',
  event_starting JSONB DEFAULT '{"in_app": true, "push": true, "email": false}',
  message_received JSONB DEFAULT '{"in_app": true, "push": true, "email": false}',
  conversation_requested JSONB DEFAULT '{"in_app": true, "push": true, "email": false}',
  shoutout_received JSONB DEFAULT '{"in_app": true, "push": true, "email": false}',
  membership_updated JSONB DEFAULT '{"in_app": true, "push": true, "email": false}',
  trustlevel_changed JSONB DEFAULT '{"in_app": true, "push": true, "email": false}',

  -- Global master switches
  push_enabled BOOLEAN DEFAULT false,
  email_enabled BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### push_subscriptions Table

```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
```

## Push Notification Architecture

### Components

1. **Web Push Service** - Browser vendor's push service (Chrome, Firefox, Safari)
2. **Push Subscriptions** - Device registrations stored in `push_subscriptions` table
3. **Edge Function** - `send-push-notification` handles delivery via `web-push` library
4. **Database Trigger** - Calls Edge Function via `pg_net` when notification created
5. **VAPID Keys** - Voluntary Application Server Identification for authentication

### Flow

1. User enables push notifications in app
2. Browser requests permission → User grants
3. Browser subscribes to push service → Returns endpoint + keys
4. App registers subscription with backend → Stored in `push_subscriptions`
5. Event occurs → Database trigger creates notification
6. Trigger checks preferences → Calls Edge Function if push enabled
7. Edge Function sends push to all user devices via Web Push API
8. Invalid endpoints (410 Gone) automatically removed

### Environment Variables

Required for push notifications:

- `VAPID_PUBLIC_KEY` - Public key for client subscription (exposed to frontend)
- `VAPID_PRIVATE_KEY` - Private key for server signing (secret)
- `VAPID_SUBJECT` - Contact URL or mailto: (e.g., `mailto:admin@example.com`)

Generate keys with: `npx web-push generate-vapid-keys`

## Email Notification Architecture

### Components

1. **Postmark API** - Transactional email service provider
2. **Edge Function** - `send-email-notification` handles delivery via Postmark REST API
3. **Database Trigger** - Calls Edge Function via `pg_net` when notification created
4. **Postmark Templates** - Server-side email templates with variable substitution
5. **Message Stream** - Dedicated transactional notification stream in Postmark

### Flow

1. Event occurs → Database trigger creates notification
2. Trigger checks preferences → Calls Edge Function if email enabled
3. Edge Function fetches user email from `profiles` table
4. Edge Function fetches notification details (for entity IDs and actor info)
5. Edge Function generates deep link URL and CTA text based on notification type
6. Edge Function calls Postmark API with template ID and variables
7. Postmark renders template and sends email
8. Email includes CTA button and preference management link

### Environment Variables

Required for email notifications:

- `POSTMARK_NOTIFICATION_SERVER_TOKEN` - Postmark Server API token (secret)
- `POSTMARK_NOTIFICATION_FROM_EMAIL` - Verified sender email address
- `POSTMARK_NOTIFICATION_TEMPLATE_ID` - Postmark template ID or alias
- `POSTMARK_NOTIFICATION_MESSAGE_STREAM` - Message stream name (e.g., `notification-transaction-stream`)
- `VITE_APP_URL` - Frontend base URL for deep links and preference URLs

### Template Requirements

Postmark template must accept these variables:

- `actor_name` - Person or system who triggered the notification
- `notification_title` - Email subject/headline
- `notification_body` - Description or preview text
- `cta_text` - Call-to-action button text
- `cta_url` - Deep link to the relevant entity
- `manage_preferences_url` - Link to `/settings/notifications` page

Template must include prominent CTA button and preference management link in footer.

### Deep Link Generation

Email CTAs link to specific entities:

- Resources/Events → `/resources/{id}`
- Messages → `/messages/{conversation_id}`
- Comments → `/resources/{id}#comment-{comment_id}`
- Shoutouts → `/shoutouts/{id}`
- Communities → `/communities/{id}`
- Default → `/notifications`
