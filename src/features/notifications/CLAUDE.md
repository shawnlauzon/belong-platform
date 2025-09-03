# Notification System Implementation

## Overview

A comprehensive notification system for the Belong Platform supporting badge counts, real-time notifications, and user preference controls across 19 notification types. The system is fully implemented with database triggers, React Query hooks, and granular user controls.

## Implementation Status

✅ **Fully Implemented (19 Notification Types)**
- All notification types with database triggers
- User preference controls for all notification categories
- Real-time notification delivery via Supabase Realtime
- Message notifications with separate controls for direct vs community messages
- Badge counts and unread state management

## Notification Types & User Controls

### Permission Group 1: **Social Interactions**

Controls notifications about direct interactions with other users:

- `comment` - Someone comments on your resource
- `comment_reply` - Someone replies to your comment  
- `shoutout_received` - Someone gives you a shoutout
- `connection_request` - Someone wants to connect with you
- `connection_accepted` - Your connection request was accepted

**Database columns**: `comments_on_resources`, `comment_replies`, `shoutout_received`, `connection_request`, `connection_accepted`

### Permission Group 2: **My Resources**

Controls notifications about resources you own:

- `claim` - Someone claims your resource
- `resource_claim_cancelled` - Someone cancelled their claim on your resource
- `resource_claim_completed` - Someone marked their claim as completed on your resource

**Database columns**: `resource_claims`, `resource_claim_cancelled`, `resource_claim_completed`

### Permission Group 3: **My Registrations**

Controls notifications about things you've signed up for (claims/event registrations):

- `claim_approved` - Your claim/registration was approved by the resource owner
- `claim_rejected` - Your claim/registration was rejected by the resource owner
- `claimed_resource_updated` - A resource/event you claimed/registered for was updated
- `claimed_resource_cancelled` - A resource/event you claimed/registered for was cancelled

**Database columns**: `claim_approved`, `claim_rejected`, `claimed_resource_updated`, `claimed_resource_cancelled`

### Permission Group 4: **My Communities** (as organizer)

Controls notifications about communities you organize:

- `community_member_joined` - Someone joined your community
- `community_member_left` - Someone left your community

**Database columns**: `community_member_joined`, `community_member_left`

### Permission Group 5: **Community Activity** (as member)

Controls notifications about communities you're a member of:

- `new_resource` - New resource added to a community you're in
- `new_event` - New event created in your community

**Database columns**: `community_resources`, `new_event`

### Permission Group 6: **Trust & Recognition**

Controls notifications about achievements:

- `trust_points_received` - You received trust points from an action
- `trust_level_changed` - You reached a new trust level

**Database columns**: `trust_points_received`, `trust_level_changed`

### Permission Group 7: **Messages** 

Controls messaging notifications with granular control:

- `direct_message` - Direct message received (1:1 conversations)
- `community_message` - Community chat message received

**Database columns**: `direct_messages`, `community_messages` (both user-controllable)

## Key Design Principles

1. **Clear Ownership Separation**: Distinguishes between "my stuff" (resources I own, communities I organize) and "their stuff" (resources I've claimed, communities I'm a member of)

2. **Unified Registrations**: Treats event attendance and resource claims uniformly as "registrations" since they use the same underlying system

3. **Minimal Overlap**: Each notification type belongs to exactly one group with no duplication

4. **User-Friendly Grouping**: Groups make intuitive sense to users managing their notification preferences

5. **Granular Message Control**: Separate user controls for direct messages vs community chat to respect different communication contexts

6. **Trigger-Based Reliability**: All notifications are created automatically via database triggers, ensuring consistency

## Database Implementation

### Notification Triggers (All Functional)

✅ **Implemented Database Triggers:**
- `shoutout_notification_trigger` → `notify_on_shoutout()`
- `connection_request_notification_trigger` → `notify_on_connection_request()`
- `connection_acceptance_notification_trigger` → `notify_on_connection_accepted()`
- `claim_status_notification_trigger` → `notify_on_claim_status_change()`
- `resource_update_notification_trigger` → `notify_on_resource_update()`
- `resource_cancellation_notification_trigger` → `notify_on_resource_cancellation()`
- `membership_join_notification_trigger` → `notify_on_membership_join()`
- `membership_leave_notification_trigger` → `notify_on_membership_leave()`
- `trust_points_notification_trigger` → `notify_on_trust_points()`
- `trust_level_notification_trigger` → `notify_on_trust_level_change()`

### Notification Preferences Schema

```sql
-- notification_preferences table columns (all user-controllable)
comments_on_resources          BOOLEAN DEFAULT TRUE
comment_replies                BOOLEAN DEFAULT TRUE
shoutout_received             BOOLEAN DEFAULT TRUE
connection_request            BOOLEAN DEFAULT TRUE
connection_accepted           BOOLEAN DEFAULT TRUE
resource_claims               BOOLEAN DEFAULT TRUE
resource_claim_cancelled      BOOLEAN DEFAULT TRUE
resource_claim_completed      BOOLEAN DEFAULT TRUE
claim_approved                BOOLEAN DEFAULT TRUE
claim_rejected                BOOLEAN DEFAULT TRUE
claimed_resource_updated      BOOLEAN DEFAULT TRUE
claimed_resource_cancelled    BOOLEAN DEFAULT TRUE
community_member_joined       BOOLEAN DEFAULT TRUE
community_member_left         BOOLEAN DEFAULT TRUE
community_resources           BOOLEAN DEFAULT TRUE
new_event                     BOOLEAN DEFAULT TRUE
trust_points_received         BOOLEAN DEFAULT TRUE
trust_level_changed           BOOLEAN DEFAULT TRUE
direct_messages               BOOLEAN DEFAULT TRUE
community_messages            BOOLEAN DEFAULT TRUE
```

## Platform Implementation

### Feature Directory Structure

```
src/features/notifications/
├── api/
│   ├── index.ts
│   ├── fetchNotifications.ts
│   ├── fetchNotificationCounts.ts
│   ├── fetchPreferences.ts
│   ├── updatePreferences.ts
│   ├── markAsRead.ts
│   ├── markAllAsRead.ts
│   └── deleteNotification.ts
├── hooks/
│   ├── index.ts
│   ├── useNotifications.ts           // Fetch notification data
│   ├── useNotificationSubscription.ts // Real-time updates
│   ├── useNotificationCounts.ts      // Badge counts
│   ├── useNotificationPreferences.ts // User preferences
│   ├── useMarkAsRead.ts
│   └── useMarkAllAsRead.ts
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

#### useNotificationPreferences - User preference management

```typescript
export function useNotificationPreferences() {
  return useQuery({
    queryKey: notificationKeys.preferences(),
    queryFn: () => fetchPreferences(supabase),
  });
}

export function useUpdateNotificationPreferences() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (preferences: NotificationPreferencesUpdate & { user_id: string }) => 
      updatePreferences(supabase, preferences),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: notificationKeys.preferences(),
      });
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

### TypeScript Type Definitions

#### Grouped Notification Preferences

```typescript
export interface MessagesPreferences {
  direct_messages: boolean;      // User-controllable
  community_messages: boolean;   // User-controllable
}

export interface GroupedNotificationPreferences {
  socialInteractions: SocialInteractionsPreferences;
  myResources: MyResourcesPreferences;
  myRegistrations: MyRegistrationsPreferences;
  myCommunities: MyCommunitiesPreferences;
  communityActivity: CommunityActivityPreferences;
  trustRecognition: TrustRecognitionPreferences;
  messages: MessagesPreferences;
}

// Helper functions for converting between flat and grouped preferences
export const groupPreferences = (preferences: NotificationPreferences): GroupedNotificationPreferences
export const flattenPreferences = (grouped: Partial<GroupedNotificationPreferences>): Partial<NotificationPreferencesUpdate>
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

## Architecture Decisions

### Current Implementation Choices

1. **Separate hooks**: `useNotifications` (data), `useNotificationSubscription` (real-time), `useNotificationCounts` (badges), `useNotificationPreferences` (user controls)
2. **Smart grouping**: Combine similar notifications to reduce clutter via `group_key` and `actor_count`
3. **Cached counts**: Use `notification_counts` table for O(1) badge lookups
4. **Polymorphic design**: Single notifications table with type-specific references
5. **Trigger-based**: Automatic notification creation via database triggers for consistency
6. **Granular message control**: Separate user preferences for direct vs community messages
7. **User-first design**: All 19 notification types are user-controllable with sensible defaults

### Message System Integration

The notification system integrates with the messaging system by:
- Distinguishing between `direct_message` and `community_message` notification types
- Allowing independent user control over each message notification type
- Supporting both 1:1 conversations and community chat contexts
- Maintaining message count separation in badge displays