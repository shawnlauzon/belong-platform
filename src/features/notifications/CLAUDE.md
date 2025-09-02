# Notification System Implementation Plan

## Overview

Implement a comprehensive notification system for the Belong Platform to support badge counts and notification display for comments, claims, messages, and new community resources.

## Notification Types

### Permission Group 1: **Social Interactions**

Controls notifications about direct interactions with other users:

- `comment` - Someone comments on your resource
- `comment_reply` - Someone replies to your comment
- `shoutout_received` - Someone gives you a shoutout
- `connection_request` - Someone wants to connect with you
- `connection_accepted` - Your connection request was accepted

### Permission Group 2: **My Resources**

Controls notifications about resources you own:

- `resource_claimed` - Someone claims your resource
- `resource_claim_cancelled` - Someone cancelled their claim on your resource
- `resource_claim_completed` - Someone marked their claim as completed on your resource

### Permission Group 3: **My Registrations**

Controls notifications about things you've signed up for (claims/event registrations):

- `claim_approved` - Your claim/registration was approved by the resource owner
- `claim_rejected` - Your claim/registration was rejected by the resource owner
- `claimed_resource_updated` - A resource/event you claimed/registered for was updated
- `claimed_resource_cancelled` - A resource/event you claimed/registered for was cancelled

### Permission Group 4: **My Communities** (as organizer)

Controls notifications about communities you organize:

- `community_member_joined` - Someone joined your community
- `community_member_left` - Someone left your community

### Permission Group 5: **Community Activity** (as member)

Controls notifications about communities you're a member of:

- `new_resource` - New resource added to a community you're in
- `new_event` - New event created in your community
- `community_invitation` - Invited to join a community

### Permission Group 6: **Trust & Recognition**

Controls notifications about achievements:

- `trust_points_received` - You received trust points from an action
- `trust_level_changed` - You reached a new trust level

### Permission Group 7: **Messages**

Always enabled (no user control):

- `message` - Direct message received

### Key Design Principles

1. **Clear Ownership Separation**: Distinguishes between "my stuff" (resources I own, communities I organize) and "their stuff" (resources I've claimed, communities I'm a member of)

2. **Unified Registrations**: Treats event attendance and resource claims uniformly as "registrations" since they use the same underlying system

3. **Minimal Overlap**: Each notification type belongs to exactly one group with no duplication

4. **User-Friendly Grouping**: Groups make intuitive sense to users managing their notification preferences

5. **Always-On Critical Notifications**: Messages remain always enabled as they're direct person-to-person communication

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

## Notes

### Design Decisions Made

1. **Separate hooks**: `useNotifications` (data), `useNotificationSubscription` (real-time), `useNotificationCounts` (badges)
2. **Smart grouping**: Combine similar notifications to reduce clutter
3. **Cached counts**: Use `notification_counts` table for O(1) badge lookups
4. **Polymorphic design**: Single notifications table with type-specific references
5. **Trigger-based**: Automatic notification creation via database triggers
