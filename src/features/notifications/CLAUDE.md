# Notifications

Multi-channel notification system with push notification support, dual confirmation, and granular per-type preferences.

## Purpose

The notifications feature provides:
- Real-time notifications for platform activities
- 19 notification types covering all user interactions
- Multi-channel delivery: in-app, push notifications (email-ready)
- User-configurable preferences per notification type per channel
- Unread count tracking
- Read/unread status management
- Type-safe metadata for each notification type
- Push notification support via Web Push API
- Dual confirmation system for transactions

## Key Entities

### Notification

Main notification entity with polymorphic references.

**Key Fields:**
- `id` - Notification ID
- `userId` - Recipient user ID
- `type` - Notification type (e.g., 'resource.commented', 'claim.responded')
- `resourceId` - Optional resource reference
- `commentId` - Optional comment reference
- `claimId` - Optional claim reference
- `communityId` - Optional community reference
- `shoutoutId` - Optional shoutout reference
- `conversationId` - Optional conversation reference
- `actorId` - User who triggered the notification (null for system notifications)
- `metadata` - Type-specific additional data
- `readAt` - When notification was read (null if unread)
- `createdAt`, `updatedAt` - Timestamps

**Notes:**
- Polymorphic design supports multiple entity types
- Metadata structure varies by notification type
- Uses database triggers for automatic creation
- Push notifications sent asynchronously via Edge Functions

### NotificationPreferences

Per-type, per-channel notification preferences stored in separate table.

**Structure:**
- One row per user
- One JSONB column per notification type (19 total)
- Each JSONB contains: `{"in_app": bool, "push": bool, "email": bool}`
- Global switches: `push_enabled`, `email_enabled`

**Key Fields:**
- `userId` - User ID
- `resource_commented` - JSONB preferences
- `comment_replied` - JSONB preferences
- `claim_created` - JSONB preferences
- ... (19 notification types total)
- `push_enabled` - Global push master switch (default: false)
- `email_enabled` - Global email master switch (default: false)

**Notes:**
- All notifications default to enabled (true) for all channels
- User must explicitly enable `push_enabled` to receive ANY push notifications
- `event.cancelled` always pushes if `push_enabled=true` (critical notification)
- JSONB design allows future channel additions without schema changes

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

### Notification Types (19 Total)

#### Comments (2)
- `resource.commented` - Someone commented on your resource → Resource owner
- `comment.replied` - Someone replied to your comment → Comment author

#### Claims (3)
- `claim.created` - Someone claimed your resource → Resource owner
- `claim.cancelled` - Someone cancelled their claim → Resource owner
- `claim.responded` - Owner approved/rejected your claim → Claimant
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
  - **Special**: Always pushes if `push_enabled=true` (critical notification)
- `resource.expiring` - Your resource expiring soon → Resource owner
- `event.starting` - Event starting soon → Event owner + Active claimants

#### Social (4)
- `message.received` - You received a message → Conversation participant
- `conversation.requested` - Someone requested to chat → Other participant
- `shoutout.received` - You received a shoutout → Shoutout receiver
- `membership.updated` - Member joined/left your community → Organizers/founders
  - Metadata includes: `{"action": "joined" | "left"}`

#### System (1)
- `trustlevel.changed` - Your trust level changed → User

### Removed Types (from previous system)

These notification types were **removed** in the redesign:
- `connection.requested` - Connection request system obsolete
- `connection.accepted` - Connection request system obsolete
- `community.created` - Never implemented
- `trustpoints.gained` - User's own action, no notification needed
- `trustpoints.lost` - User's own action, no notification needed
- `claim.completed` - Replaced by dual confirmation system

### Notification Channels

Each notification type supports multiple delivery channels:

1. **In-App** - Shown in notification center (default: ON)
2. **Push** - Web Push API notifications (default: ON, requires `push_enabled=true`)
3. **Email** - Email notifications (default: OFF, future implementation)

**Channel Logic:**
```
Send in-app IF:
  notification_preferences->'type'->>'in_app' = 'true'

Send push IF:
  push_enabled = true
  AND (type = 'event.cancelled' OR notification_preferences->'type'->>'push' = 'true')

Send email IF:
  email_enabled = true
  AND notification_preferences->'type'->>'email' = 'true'
```

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
  types: ['resource.commented', 'comment.replied']
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
    email: false
  }
});

// Enable push notifications globally (required for ANY push)
await updatePrefs.mutateAsync({
  push_enabled: true
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
  applicationServerKey: VAPID_PUBLIC_KEY
});

// 3. Register with backend
await register.mutateAsync({
  endpoint: subscription.endpoint,
  p256dhKey: arrayBufferToBase64(subscription.getKey('p256dh')),
  authKey: arrayBufferToBase64(subscription.getKey('auth')),
  userAgent: navigator.userAgent
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
