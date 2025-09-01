# Notification System Implementation Plan

## Overview

Implement a comprehensive notification system for the Belong Platform to support badge counts and notification display for comments, claims, messages, and new community resources.

## Notification Types

1. **Comment on my resource** - Someone comments on a resource I own
2. **Reply to my comment** - Someone replies to one of my comments
3. **Claim on my resource** - Someone claims one of my resources
4. **Message received** - New direct message (already tracked but needs badge integration)
5. **New community resource** - New resource added to a community I'm a member of

## Database Schema Design

### Core Tables

#### 1. notifications

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('comment', 'comment_reply', 'claim', 'message', 'new_resource')),

  -- Polymorphic references (only one will be set based on type)
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  claim_id UUID REFERENCES resource_claims(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,

  -- Actor who triggered the notification
  actor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

  -- Grouping support for "John and 3 others commented"
  group_key TEXT,
  actor_count INTEGER DEFAULT 1,

  -- Metadata for rendering notifications
  title TEXT NOT NULL,
  body TEXT,
  image_url TEXT,
  action_url TEXT, -- Deep link to content
  metadata JSONB DEFAULT '{}',

  -- Status tracking
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. notification_preferences

```sql
CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,

  -- Per-type preferences
  comments_on_resources BOOLEAN DEFAULT TRUE,
  comment_replies BOOLEAN DEFAULT TRUE,
  resource_claims BOOLEAN DEFAULT TRUE,
  new_messages BOOLEAN DEFAULT TRUE,
  community_resources BOOLEAN DEFAULT TRUE,

  -- Global settings (for future email/push)
  email_enabled BOOLEAN DEFAULT FALSE,
  push_enabled BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3. notification_counts (for performance)

```sql
CREATE TABLE notification_counts (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,

  -- Cached counts by category
  unread_total INTEGER DEFAULT 0,
  unread_comments INTEGER DEFAULT 0,
  unread_claims INTEGER DEFAULT 0,
  unread_messages INTEGER DEFAULT 0,
  unread_resources INTEGER DEFAULT 0,

  -- For "new" indicators
  last_checked_at TIMESTAMPTZ DEFAULT NOW(),

  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 4. seen_resources (track viewed community resources)

```sql
CREATE TABLE seen_resources (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  seen_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, resource_id)
);
```

### Indexes for Performance

```sql
-- Core notification queries
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_group ON notifications(user_id, group_key, is_read);
CREATE INDEX idx_notifications_type ON notifications(user_id, type, created_at DESC);

-- Cleanup and maintenance
CREATE INDEX idx_notifications_cleanup ON notifications(created_at) WHERE is_read = TRUE;
```

## Database Functions & Triggers

### 1. Core Notification Creation Function

```sql
CREATE OR REPLACE FUNCTION create_or_update_notification(
  p_user_id UUID,
  p_type TEXT,
  p_actor_id UUID,
  p_group_key TEXT,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_comment_id UUID DEFAULT NULL,
  p_claim_id UUID DEFAULT NULL,
  p_message_id UUID DEFAULT NULL,
  p_conversation_id UUID DEFAULT NULL,
  p_community_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS notifications;
```

### 2. Preference Check Function

```sql
CREATE OR REPLACE FUNCTION should_send_notification(p_user_id UUID, p_type TEXT)
RETURNS BOOLEAN;
```

### 3. Count Update Function

```sql
CREATE OR REPLACE FUNCTION update_notification_counts(
  p_user_id UUID,
  p_type TEXT,
  p_delta INTEGER
) RETURNS VOID;
```

### 4. Trigger Functions

#### Comment Notifications

```sql
CREATE OR REPLACE FUNCTION notify_on_comment() RETURNS TRIGGER;
CREATE TRIGGER comment_notification_trigger
AFTER INSERT ON comments
FOR EACH ROW
EXECUTE FUNCTION notify_on_comment();
```

#### Claim Notifications

```sql
CREATE OR REPLACE FUNCTION notify_on_claim() RETURNS TRIGGER;
CREATE TRIGGER claim_notification_trigger
AFTER INSERT ON resource_claims
FOR EACH ROW
EXECUTE FUNCTION notify_on_claim();
```

#### New Resource Notifications

```sql
CREATE OR REPLACE FUNCTION notify_on_new_resource() RETURNS TRIGGER;
CREATE TRIGGER resource_notification_trigger
AFTER INSERT ON resources
FOR EACH ROW
EXECUTE FUNCTION notify_on_new_resource();
```

## Platform Implementation

### Feature Directory Structure

```
src/features/notifications/
├── api/
│   ├── index.ts
│   ├── fetchNotifications.ts
│   ├── fetchNotificationCounts.ts
│   ├── markAsRead.ts
│   ├── markAllAsRead.ts
│   ├── deleteNotification.ts
│   └── updatePreferences.ts
├── hooks/
│   ├── index.ts
│   ├── useNotifications.ts           // Fetch notification data
│   ├── useNotificationSubscription.ts // Real-time updates
│   ├── useNotificationCounts.ts      // Badge counts
│   ├── useMarkAsRead.ts
│   ├── useMarkAllAsRead.ts
│   └── useNotificationPreferences.ts
├── transformers/
│   ├── index.ts
│   └── notificationTransformer.ts
├── types/
│   ├── index.ts
│   ├── notification.ts
│   ├── notificationRow.ts
│   ├── notificationCounts.ts
│   └── notificationPreferences.ts
├── queries.ts
└── index.ts
```

### Key Hook Implementations

#### useNotifications - Fetch notification data

```typescript
export function useNotifications(options?: {
  filter?: 'all' | 'unread' | 'read';
  type?: NotificationType;
  limit?: number;
}) {
  return useInfiniteQuery({
    queryKey: notificationKeys.list(options),
    queryFn: ({ pageParam = 0 }) =>
      fetchNotifications({
        ...options,
        offset: pageParam * (options?.limit || 20),
      }),
    getNextPageParam: (lastPage, pages) => {
      return lastPage.length === (options?.limit || 20)
        ? pages.length
        : undefined;
    },
  });
}
```

#### useNotificationSubscription - Real-time updates

```typescript
export function useNotificationSubscription(options?: {
  onNewNotification?: (notification: Notification) => void;
  onCountChange?: (counts: NotificationCounts) => void;
  onNotificationRead?: (notificationId: string) => void;
}) {
  const client = useSupabase();
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = client
      .channel(`user:${userId}:notifications`)
      .on('broadcast', { event: 'new_notification' }, (payload) => {
        // Update notification list cache
        // Call onNewNotification callback
      })
      .on('broadcast', { event: 'count_update' }, (payload) => {
        // Update counts cache
        // Call onCountChange callback
      })
      .subscribe();

    return () => client.removeChannel(channel);
  }, [client, userId]);
}
```

#### useNotificationCounts - Badge counts

```typescript
export function useNotificationCounts() {
  return useQuery({
    queryKey: notificationKeys.counts(),
    queryFn: async () => {
      // Combine notification counts + message counts
      const notificationCounts = await fetchNotificationCounts();
      const messageCounts = await fetchMessageUnreadCount();

      return {
        total: notificationCounts.unread_total + messageCounts.total,
        notifications: notificationCounts.unread_total,
        messages: messageCounts.total,
        comments: notificationCounts.unread_comments,
        claims: notificationCounts.unread_claims,
        resources: notificationCounts.unread_resources,
      };
    },
    refetchInterval: 30000, // Backup polling
  });
}
```

## Advanced Features (Future)

### Notification Grouping Examples

- "John commented on your listing" → "John and 2 others commented on your listing"
- "Jane claimed your bike" → "Jane and 1 other claimed your bike"
- "New resources in Downtown Community" → "3 new resources in Downtown Community"

### Smart Notifications

- Don't notify if user is actively viewing the resource
- Batch similar notifications (e.g., multiple claims in 5 minutes)
- Respect quiet hours if configured

### Performance Optimizations

- Partition notifications table by month (for high volume)
- Use materialized views for complex aggregations
- Implement notification archival system
- Add read replica support for heavy read workloads

## Testing Strategy

### Unit Tests

- [ ] Notification API functions (fetch, mark read, preferences)
- [ ] Hook behavior and cache updates
- [ ] Transformer functions
- [ ] Database trigger functions

### Integration Tests

- [ ] End-to-end notification flows
- [ ] Real-time subscription behavior
- [ ] Badge count accuracy across scenarios
- [ ] Notification grouping logic
- [ ] Cross-feature integration (comments → notifications)

### Performance Tests

- [ ] Badge count query performance (< 50ms)
- [ ] Notification list pagination performance
- [ ] Real-time broadcast latency (< 200ms)
- [ ] Database trigger performance impact
- [ ] Memory usage with many subscriptions

## Security Considerations

### Row Level Security (RLS)

```sql
-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can only update their own notifications
CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid());
```

### Privacy & Blocking

- No notifications from blocked users
- No sensitive data in notification previews
- Respect user privacy preferences
- Secure real-time channel authorization

## Monitoring & Maintenance

### Metrics to Track

- Notification delivery success rate
- Real-time update latency
- Badge count accuracy
- User engagement with notifications
- Database performance impact

### Maintenance Tasks

- Clean up old read notifications (monthly)
- Monitor trigger performance impact
- Update cached counts periodically
- Archive old notification data

## Success Criteria

### Functional Requirements

- ✅ Badge counts update instantly across all sessions
- ✅ Notifications appear for all specified events
- ✅ Real-time updates work without page refresh
- ✅ User preferences are respected
- ✅ Blocked users don't generate notifications

### Performance Requirements

- Badge count queries < 50ms (p95)
- Real-time updates < 200ms latency
- Notification list loads < 500ms
- UI remains responsive with 1000+ notifications
- Memory usage stable over time

### User Experience Requirements

- Clear, actionable notification messages
- Appropriate grouping to avoid spam
- Easy mark-as-read functionality
- Intuitive notification preferences
- Seamless integration with existing message badges

## Notes

### Design Decisions Made

1. **Separate hooks**: `useNotifications` (data), `useNotificationSubscription` (real-time), `useNotificationCounts` (badges)
2. **Smart grouping**: Combine similar notifications to reduce clutter
3. **Cached counts**: Use `notification_counts` table for O(1) badge lookups
4. **Polymorphic design**: Single notifications table with type-specific references
5. **Trigger-based**: Automatic notification creation via database triggers
