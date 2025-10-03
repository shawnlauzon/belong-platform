# Notifications

Multi-type notification system with user preferences and grouped categories.

## Purpose

The notifications feature provides:
- Real-time notifications for platform activities
- 20+ notification types covering all user interactions
- User-configurable preferences by notification group
- Unread count tracking
- Read/unread status management
- Type-safe metadata for each notification type

## Key Entities

### Notification

Main notification entity with polymorphic references.

**Key Fields:**
- `id` - Notification ID
- `userId` - Recipient user ID
- `type` - Notification type (e.g., 'comment.created', 'claim.approved')
- `resourceId` - Optional resource reference
- `commentId` - Optional comment reference
- `claimId` - Optional claim reference
- `communityId` - Optional community reference
- `shoutoutId` - Optional shoutout reference
- `conversationId` - Optional conversation reference
- `actorId` - User who triggered the notification
- `metadata` - Type-specific additional data
- `readAt` - When notification was read (null if unread)
- `createdAt`, `updatedAt` - Timestamps

**Notes:**
- Polymorphic design supports multiple entity types
- Metadata structure varies by notification type
- Uses database triggers for automatic creation

### NotificationGroup

Logical groupings of notification types for user preferences.

**Groups:**
- `SOCIAL_INTERACTIONS` - Comments, replies, shoutouts, connections
- `MY_RESOURCES` - Claims on user's resources
- `MY_REGISTRATIONS` - Updates to user's claims
- `MY_COMMUNITIES` - Community membership changes
- `COMMUNITY_ACTIVITY` - New resources and events
- `TRUST_RECOGNITION` - Trust points and level changes
- `MESSAGES` - Direct messages and conversations

### NotificationPreferences

User preferences for each notification group.

**Key Fields:**
- `userId` - User ID
- `groupName` - Notification group
- `enabled` - Whether group is enabled
- `createdAt`, `updatedAt` - Timestamps

**Notes:**
- Preferences default to enabled
- Can be configured per group
- Affects notification delivery

## Core Concepts

### Notification Types

Platform supports 20+ notification types:

**Comments:** `comment.created`, `comment.replied`
**Claims:** `claim.created`, `claim.approved`, `claim.rejected`, `claim.cancelled`, `claim.completed`
**Resources:** `resource.created`, `resource.updated`, `resource.cancelled`
**Events:** `event.created`
**Communities:** `community.created`, `member.joined`, `member.left`
**Social:** `shoutout.created`, `connection.requested`, `connection.accepted`
**Messaging:** `message.created`, `conversation.created`
**Trust:** `trustpoints.gained`, `trustpoints.lost`, `trustlevel.changed`

### Type Guards

Helper functions to categorize notifications:
- `isCommentNotification(type)`
- `isClaimNotification(type)`
- `isResourceNotification(type)`
- `isSocialNotification(type)`
- `isTrustNotification(type)`
- `isMessageNotification(type)`
- `isConversationNotification(type)`

### Metadata

Each notification type has specific metadata:
- **CommentMetadata** - Comment text, resource info
- **ShoutoutMetadata** - Shoutout details
- **TrustPointsMetadata** - Points change, new total
- **TrustLevelMetadata** - Old/new level
- **ResourceUpdatedMetadata** - What changed
- **ConversationMetadata** - Conversation details

### Unread Counts

System tracks unread notifications:
- Per-user unread count
- Real-time updates
- Efficient counting queries

## API Reference

### Hooks
- `useNotifications(filter?)` - Query notifications with optional filters
- `useNotificationUnreadCount()` - Get unread count for current user
- `useMarkAsRead()` - Mark notification(s) as read
- `useNotificationPreferences()` - Get user's notification preferences
- `useGroupedNotificationPreferences()` - Get preferences grouped by category
- `useUpdateNotificationPreferences()` - Update preference settings

### Key Functions
- `fetchNotifications(supabase, filter)` - Fetch notifications
- `fetchUnreadCount(supabase, userId)` - Get unread count
- `markAsRead(supabase, notificationIds)` - Mark as read
- `getNotificationGroup(type)` - Get group for notification type

## Important Patterns

### Querying Notifications

```typescript
// Get all notifications for current user
const { data: notifications } = useNotifications();

// Get unread count
const { data: unreadCount } = useNotificationUnreadCount();

// Filter by type
const { data: commentNotifs } = useNotifications({
  types: ['comment.created', 'comment.replied']
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

// Get grouped preferences
const { data: grouped } = useGroupedNotificationPreferences();

// Update preference
const updatePrefs = useUpdateNotificationPreferences();
await updatePrefs.mutateAsync({
  groupName: 'SOCIAL_INTERACTIONS',
  enabled: false
});
```

### Type Guards

```typescript
if (isCommentNotification(notification.type)) {
  // Handle comment notification
  const metadata = notification.metadata as CommentMetadata;
}
```

### Getting Notification Group

```typescript
const group = getNotificationGroup(notification.type);
// Returns: NotificationGroup enum value
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