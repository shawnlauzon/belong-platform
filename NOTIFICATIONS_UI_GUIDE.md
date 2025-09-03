# Notifications Platform - UI Developer Guide

A comprehensive guide for integrating the Belong Platform notification system into your React applications.

## Table of Contents

- [Quick Start](#quick-start)
- [Core Hooks](#core-hooks)
- [Notification Types](#notification-types)
- [User Preferences](#user-preferences)
- [UI Component Examples](#ui-component-examples)
- [Real-time Features](#real-time-features)
- [Advanced Patterns](#advanced-patterns)
- [Performance Optimization](#performance-optimization)
- [Accessibility](#accessibility)

## Quick Start

```tsx
import { 
  useNotifications, 
  useNotificationCount,
  type Notification 
} from '@belongnetwork/platform';

function NotificationBell() {
  const { data: count } = useNotificationCount();
  const { data: notifications } = useNotifications();

  return (
    <button className="relative">
      🔔
      {count && count > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
          {count}
        </span>
      )}
    </button>
  );
}
```

## Core Hooks

### `useNotifications(filter?)`

Fetches notifications with real-time updates and infinite scrolling support. Real-time subscriptions are built-in - no separate hook needed.

```tsx
import { useNotifications } from '@belongnetwork/platform';

function NotificationList() {
  const { 
    data, 
    fetchNextPage, 
    hasMore, 
    isFetchingNextPage,
    isLoading,
    error
  } = useNotifications({
    isRead: false, // Only unread notifications
    limit: 20
  });

  if (isLoading) return <div>Loading notifications...</div>;
  if (error) return <div>Error loading notifications: {error.message}</div>;

  return (
    <div className="notification-list">
      {data?.map((notification) => (
        <NotificationItem key={notification.id} notification={notification} />
      ))}
      
      {hasMore && (
        <button 
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? 'Loading more...' : 'Load More'}
        </button>
      )}
    </div>
  );
}

// Filter options
const filters = {
  type: 'comment' | 'claim' | 'message' | ..., // Specific notification type
  isRead: true | false | undefined,             // Read status filter
  limit: 20,                                    // Page size (default: 20)
};

// Hook returns React Query result with:
// data: Notification[] - Array of notifications (real-time updated)
// Plus standard React Query fields (isLoading, isError, error, etc.)
```

### `useNotificationCount()`

Provides real-time notification count with built-in subscriptions and automatic refresh.

```tsx
import { useNotificationCount } from '@belongnetwork/platform';

function NotificationBell() {
  const { data: count, isLoading, isError } = useNotificationCount();

  if (isLoading) return <button>🔔</button>;
  if (isError) return <button>🔔 ⚠️</button>;

  return (
    <button className="relative">
      🔔
      {count && count > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}

// Hook returns React Query result with:
// data: number - Total unread notification count (real-time updated)
// Plus standard React Query fields (isLoading, isError, error, etc.)
```


### `useNotificationPreferences()` & `useUpdateNotificationPreferences()`

Manage user notification preferences with 7 grouped controls.

```tsx
import { 
  useGroupedNotificationPreferences, 
  useUpdateNotificationPreferences 
} from '@belongnetwork/platform';

function NotificationSettings() {
  const { data: preferences, isLoading } = useGroupedNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();

  if (isLoading || !preferences) return <div>Loading preferences...</div>;

  const togglePreference = (key: keyof typeof preferences) => {
    updatePreferences.mutate({
      user_id: currentUserId,
      [key]: !preferences[key]
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Notification Preferences</h3>
      
      <PreferenceToggle
        enabled={preferences.social_interactions}
        title="Social Interactions"
        description="Comments, replies, shoutouts, and connections"
        onChange={() => togglePreference('social_interactions')}
      />
      
      <PreferenceToggle
        enabled={preferences.my_resources}
        title="My Resources"
        description="Claims and activity on your resources"
        onChange={() => togglePreference('my_resources')}
      />
      
      <PreferenceToggle
        enabled={preferences.my_registrations}
        title="My Registrations"
        description="Updates on resources/events you've claimed"
        onChange={() => togglePreference('my_registrations')}
      />
      
      <PreferenceToggle
        enabled={preferences.my_communities}
        title="My Communities"
        description="Activity in communities you organize"
        onChange={() => togglePreference('my_communities')}
      />
      
      <PreferenceToggle
        enabled={preferences.community_activity}
        title="Community Activity"
        description="New resources and events in your communities"
        onChange={() => togglePreference('community_activity')}
      />
      
      <PreferenceToggle
        enabled={preferences.trust_recognition}
        title="Trust & Recognition"
        description="Trust points and level achievements"
        onChange={() => togglePreference('trust_recognition')}
      />
      
      <div className="border-t pt-4">
        <h4 className="font-medium mb-2">Messages</h4>
        <PreferenceToggle
          enabled={preferences.direct_messages}
          title="Direct Messages"
          description="1:1 private conversations"
          onChange={() => togglePreference('direct_messages')}
        />
        
        <PreferenceToggle
          enabled={preferences.community_messages}
          title="Community Messages"
          description="Community chat notifications"
          onChange={() => togglePreference('community_messages')}
        />
      </div>
    </div>
  );
}

function PreferenceToggle({ 
  enabled, 
  title, 
  description, 
  onChange 
}: {
  enabled: boolean;
  title: string;
  description: string;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div>
        <h4 className="font-medium">{title}</h4>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      <label className="switch">
        <input
          type="checkbox"
          checked={enabled}
          onChange={onChange}
        />
        <span className="slider round"></span>
      </label>
    </div>
  );
}
```

### `useMarkAsRead()` & `useMarkAllAsRead()`

Mark individual or all notifications as read.

```tsx
import { useMarkAsRead, useMarkAllAsRead } from '@belongnetwork/platform';

function NotificationActions() {
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  return (
    <div className="flex gap-2">
      <button
        onClick={() => markAsRead.mutate('notification-id')}
        disabled={markAsRead.isPending}
      >
        Mark as Read
      </button>
      
      <button
        onClick={() => markAllAsRead.mutate()}
        disabled={markAllAsRead.isPending}
      >
        Mark All as Read
      </button>
    </div>
  );
}
```

## Notification Types

The platform supports 19 different notification types organized into 7 permission groups:

### Social Interactions
- `comment` - Someone commented on your resource
- `comment_reply` - Someone replied to your comment
- `shoutout_received` - Someone gave you a shoutout
- `connection_request` - Someone wants to connect
- `connection_accepted` - Your connection request was accepted

### My Resources
- `claim` - Someone claimed your resource
- `resource_claim_cancelled` - Someone cancelled their claim
- `resource_claim_completed` - Someone completed their claim

### My Registrations
- `claim_approved` - Your claim was approved
- `claim_rejected` - Your claim was rejected
- `claimed_resource_updated` - A resource you claimed was updated
- `claimed_resource_cancelled` - A resource you claimed was cancelled

### My Communities (as organizer)
- `community_member_joined` - Someone joined your community
- `community_member_left` - Someone left your community

### Community Activity (as member)
- `new_resource` - New resource in your community
- `new_event` - New event in your community

### Trust & Recognition
- `trust_points_received` - You earned trust points
- `trust_level_changed` - You reached a new trust level

### Messages
- `message` - Direct or community message (deprecated)
- Use `direct_messages` and `community_messages` preferences instead

### Type Guards

Use built-in type guards to categorize notifications:

```tsx
import { 
  isCommentNotification,
  isClaimNotification,
  isResourceNotification,
  isSocialNotification,
  isTrustNotification,
  isMessageNotification,
  getNotificationGroup
} from '@belongnetwork/platform';

function NotificationIcon({ type }: { type: Notification['type'] }) {
  if (isCommentNotification(type)) return <CommentIcon />;
  if (isClaimNotification(type)) return <ClaimIcon />;
  if (isResourceNotification(type)) return <ResourceIcon />;
  if (isSocialNotification(type)) return <SocialIcon />;
  if (isTrustNotification(type)) return <TrustIcon />;
  if (isMessageNotification(type)) return <MessageIcon />;
  
  return <DefaultIcon />;
}
```

## UI Component Examples

### Complete Notification Item

```tsx
import { 
  type Notification, 
  useMarkAsRead,
  getNotificationGroup 
} from '@belongnetwork/platform';

function NotificationItem({ notification }: { notification: Notification }) {
  const markAsRead = useMarkAsRead();

  const handleClick = () => {
    if (!notification.isRead) {
      markAsRead.mutate(notification.id);
    }
    
    // Navigate to action URL
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  return (
    <div 
      className={`
        notification-item p-4 border-b cursor-pointer hover:bg-gray-50
        ${!notification.isRead ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}
      `}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        {/* Actor Avatar */}
        <div className="flex-shrink-0">
          <img
            src={notification.actorAvatarUrl || '/default-avatar.png'}
            alt={notification.actorName || 'User'}
            className="w-10 h-10 rounded-full"
          />
          {notification.actorCount > 1 && (
            <div className="absolute -mt-2 -mr-2 bg-blue-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center">
              +{notification.actorCount - 1}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">{notification.title}</h4>
            <span className="text-xs text-gray-500">
              {formatRelativeTime(notification.createdAt)}
            </span>
          </div>
          
          {notification.body && (
            <p className="text-sm text-gray-600 mt-1">{notification.body}</p>
          )}
          
          <div className="flex items-center gap-2 mt-2">
            <NotificationTypeChip type={notification.type} />
            {!notification.isRead && (
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            )}
          </div>
        </div>

        {/* Thumbnail */}
        {notification.imageUrl && (
          <div className="flex-shrink-0">
            <img
              src={notification.imageUrl}
              alt=""
              className="w-12 h-12 rounded object-cover"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationTypeChip({ type }: { type: Notification['type'] }) {
  const group = getNotificationGroup(type);
  
  const colors = {
    social_interactions: 'bg-green-100 text-green-800',
    my_resources: 'bg-blue-100 text-blue-800',
    my_registrations: 'bg-purple-100 text-purple-800',
    my_communities: 'bg-orange-100 text-orange-800',
    community_activity: 'bg-yellow-100 text-yellow-800',
    trust_recognition: 'bg-red-100 text-red-800',
    messages: 'bg-gray-100 text-gray-800'
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs ${colors[group]}`}>
      {type.replace(/_/g, ' ')}
    </span>
  );
}
```

### Notification Panel

```tsx
function NotificationPanel() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const { data: notifications, isLoading } = useNotifications({
    isRead: filter === 'unread' ? false : undefined,
    limit: 50
  });
  
  const { data: count } = useNotificationCount();
  const markAllAsRead = useMarkAllAsRead();

  return (
    <div className="notification-panel w-96 bg-white shadow-lg rounded-lg border">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Notifications</h3>
          {count && count > 0 && (
            <button
              onClick={() => markAllAsRead.mutate()}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Mark all read
            </button>
          )}
        </div>
        
        {/* Filter Tabs */}
        <div className="flex gap-1 mt-3">
          <FilterTab
            active={filter === 'all'}
            onClick={() => setFilter('all')}
            label={`All${count ? ` (${count})` : ''}`}
          />
          <FilterTab
            active={filter === 'unread'}
            onClick={() => setFilter('unread')}
            label={`Unread${count ? ` (${count})` : ''}`}
          />
        </div>
      </div>

      {/* Notification List */}
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">
            Loading notifications...
          </div>
        ) : notificationList.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">🔔</div>
            <p>No notifications yet</p>
          </div>
        ) : (
          notificationList.map((notification) => (
            <NotificationItem 
              key={notification.id} 
              notification={notification} 
            />
          ))
        )}
      </div>
    </div>
  );
}

function FilterTab({ 
  active, 
  onClick, 
  label 
}: { 
  active: boolean; 
  onClick: () => void; 
  label: string; 
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-sm transition-colors ${
        active 
          ? 'bg-blue-100 text-blue-700' 
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {label}
    </button>
  );
}
```

## Real-time Features

### Toast Notifications

```tsx
import { useNotificationSubscription } from '@belongnetwork/platform';

function ToastManager() {
  const [toasts, setToasts] = useState<Notification[]>([]);

  useNotificationSubscription({
    onNewNotification: (notification) => {
      // Add toast
      const toast = { ...notification, toastId: Date.now() };
      setToasts(prev => [toast, ...prev]);

      // Auto-remove after 5 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.toastId !== toast.toastId));
      }, 5000);
    }
  });

  return (
    <div className="fixed top-4 right-4 space-y-2 z-50">
      {toasts.map((notification) => (
        <ToastNotification 
          key={notification.toastId} 
          notification={notification}
          onClose={() => setToasts(prev => 
            prev.filter(t => t.toastId !== notification.toastId)
          )}
        />
      ))}
    </div>
  );
}

function ToastNotification({ 
  notification, 
  onClose 
}: { 
  notification: Notification; 
  onClose: () => void; 
}) {
  return (
    <div className="toast-notification bg-white shadow-lg rounded-lg border p-4 min-w-80 animate-slide-in">
      <div className="flex items-start gap-3">
        <img
          src={notification.actorAvatarUrl || '/default-avatar.png'}
          alt=""
          className="w-8 h-8 rounded-full"
        />
        <div className="flex-1">
          <h4 className="font-medium text-sm">{notification.title}</h4>
          {notification.body && (
            <p className="text-sm text-gray-600">{notification.body}</p>
          )}
        </div>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      </div>
    </div>
  );
}
```

### Live Badge Updates

```tsx
function LiveNotificationBell() {
  const [count, setCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const { data: counts } = useNotificationCount();

  useNotificationSubscription({
    onCountChange: (newCounts) => {
      if (newCounts.total > count) {
        // Animate on new notifications
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 300);
      }
      setCount(newCounts.total);
    }
  });

  // Initialize count
  useEffect(() => {
    if (counts) {
      setCount(counts.total);
    }
  }, [counts]);

  return (
    <button 
      className={`relative p-2 ${isAnimating ? 'animate-pulse' : ''}`}
    >
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2A3 3 0 0 0 9 5v4.38L7.29 10.96a1 1 0 0 0-.29.71v1.83a1 1 0 0 0 .29.71L9 15.62V19a3 3 0 0 0 3 3 3 3 0 0 0 3-3v-3.38l1.71-1.41a1 1 0 0 0 .29-.71v-1.83a1 1 0 0 0-.29-.71L15 9.38V5a3 3 0 0 0-3-3z"/>
      </svg>
      
      {count > 0 && (
        <span 
          className={`
            absolute -top-1 -right-1 bg-red-500 text-white rounded-full 
            min-w-5 h-5 text-xs flex items-center justify-center px-1
            ${isAnimating ? 'animate-bounce' : ''}
          `}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
```

## Advanced Patterns

### Notification Grouping

Handle grouped notifications (e.g., "John and 2 others commented"):

```tsx
function GroupedNotification({ notification }: { notification: Notification }) {
  const renderActors = () => {
    if (notification.actorCount === 1) {
      return notification.actorName || 'Someone';
    }
    
    const otherCount = notification.actorCount - 1;
    return `${notification.actorName} and ${otherCount} other${otherCount > 1 ? 's' : ''}`;
  };

  return (
    <div className="notification-item">
      <div className="flex items-center gap-2">
        <AvatarStack actors={notification.actorCount} />
        <div>
          <span className="font-medium">{renderActors()}</span>
          <span className="ml-1">{getActionText(notification.type)}</span>
        </div>
      </div>
    </div>
  );
}

function AvatarStack({ actors }: { actors: number }) {
  return (
    <div className="flex -space-x-2">
      {/* Show up to 3 avatars */}
      {Array.from({ length: Math.min(actors, 3) }).map((_, i) => (
        <img
          key={i}
          src={`/avatar-${i + 1}.png`}
          className="w-8 h-8 rounded-full border-2 border-white"
          alt=""
        />
      ))}
      {actors > 3 && (
        <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs">
          +{actors - 3}
        </div>
      )}
    </div>
  );
}
```

### Smart Filtering

```tsx
function SmartNotificationList() {
  const [activeFilter, setActiveFilter] = useState<'all' | 'social' | 'resources'>('all');
  
  const getFilteredNotifications = (notifications: Notification[]) => {
    switch (activeFilter) {
      case 'social':
        return notifications.filter(n => 
          isSocialNotification(n.type) || isCommentNotification(n.type)
        );
      case 'resources':
        return notifications.filter(n => 
          isResourceNotification(n.type) || isClaimNotification(n.type)
        );
      default:
        return notifications;
    }
  };

  const { data } = useNotifications();
  const notifications = data || [];
  const filteredNotifications = getFilteredNotifications(notifications);

  return (
    <div>
      <FilterTabs 
        active={activeFilter} 
        onChange={setActiveFilter}
        counts={{
          all: notifications.length,
          social: notifications.filter(n => isSocialNotification(n.type)).length,
          resources: notifications.filter(n => isResourceNotification(n.type)).length
        }}
      />
      
      {filteredNotifications.map(notification => (
        <NotificationItem key={notification.id} notification={notification} />
      ))}
    </div>
  );
}
```

## Performance Optimization

### Query Invalidation Strategy

```tsx
import { useQueryClient } from '@tanstack/react-query';
import { notificationKeys } from '@belongnetwork/platform';

function useOptimizedNotifications() {
  const queryClient = useQueryClient();

  // Selective invalidation
  const invalidateNotifications = (type?: 'list' | 'counts' | 'preferences') => {
    switch (type) {
      case 'list':
        queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
        break;
      case 'counts':
        queryClient.invalidateQueries({ queryKey: notificationKeys.counts() });
        break;
      case 'preferences':
        queryClient.invalidateQueries({ queryKey: notificationKeys.preferences() });
        break;
      default:
        queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    }
  };

  return { invalidateNotifications };
}
```

### Optimistic Updates

```tsx
function OptimisticMarkAsRead() {
  const queryClient = useQueryClient();
  const markAsRead = useMarkAsRead();

  const optimisticMarkAsRead = (notificationId: string) => {
    // Optimistically update the notification
    queryClient.setQueriesData(
      { queryKey: notificationKeys.lists() },
      (oldData: any) => {
        if (!oldData) return oldData;
        
        return {
          ...oldData,
          pages: oldData.pages.map((page: Notification[]) =>
            page.map(notification =>
              notification.id === notificationId
                ? { ...notification, isRead: true, readAt: new Date() }
                : notification
            )
          )
        };
      }
    );

    // Perform the actual update
    markAsRead.mutate(notificationId, {
      onError: () => {
        // Revert on error
        queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      }
    });
  };

  return optimisticMarkAsRead;
}
```

## Accessibility

### Screen Reader Support

```tsx
function AccessibleNotificationList() {
  const { data } = useNotifications();
  const notifications = data || [];
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div 
      role="region" 
      aria-label="Notifications"
      aria-live="polite"
      aria-atomic="false"
    >
      <div className="sr-only">
        {unreadCount > 0 && (
          <p>{unreadCount} unread notifications</p>
        )}
      </div>
      
      <ul role="list">
        {notifications.map((notification, index) => (
          <li key={notification.id}>
            <div
              role="button"
              tabIndex={0}
              aria-label={`
                ${notification.isRead ? 'Read' : 'Unread'} notification: 
                ${notification.title}
                ${notification.body ? `. ${notification.body}` : ''}
                . From ${notification.actorName || 'Unknown user'}
                . ${formatRelativeTime(notification.createdAt)}
              `}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  // Handle notification click
                }
              }}
            >
              <NotificationContent notification={notification} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Keyboard Navigation

```tsx
function KeyboardNavigableNotifications() {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const { data } = useNotifications();
  const notifications = data || [];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex(prev => 
            prev < notifications.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex(prev => prev > 0 ? prev - 1 : prev);
          break;
        case 'Enter':
          if (focusedIndex >= 0) {
            // Handle notification selection
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedIndex, notifications.length]);

  return (
    <div className="notification-list">
      {notifications.map((notification, index) => (
        <div
          key={notification.id}
          className={`
            notification-item p-3 cursor-pointer
            ${index === focusedIndex ? 'ring-2 ring-blue-500' : ''}
          `}
          onMouseEnter={() => setFocusedIndex(index)}
        >
          <NotificationContent notification={notification} />
        </div>
      ))}
    </div>
  );
}
```

## Utilities

### Time Formatting

```tsx
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}
```

### Notification Type Helpers

```tsx
function getActionText(type: Notification['type']): string {
  const actions = {
    comment: 'commented on your resource',
    comment_reply: 'replied to your comment',
    claim: 'claimed your resource',
    shoutout_received: 'gave you a shoutout',
    connection_request: 'wants to connect with you',
    connection_accepted: 'accepted your connection',
    resource_claim_cancelled: 'cancelled their claim',
    resource_claim_completed: 'completed their claim',
    claim_approved: 'approved your claim',
    claim_rejected: 'declined your claim',
    claimed_resource_updated: 'updated a resource you claimed',
    claimed_resource_cancelled: 'cancelled a resource you claimed',
    community_member_joined: 'joined your community',
    community_member_left: 'left your community',
    new_resource: 'shared a new resource',
    new_event: 'created a new event',
    trust_points_received: 'You earned trust points',
    trust_level_changed: 'You reached a new trust level',
    message: 'sent you a message'
  };

  return actions[type] || 'updated something';
}
```

## Best Practices

1. **Always handle loading states** - Use skeleton screens or loading indicators
2. **Implement error boundaries** - Gracefully handle API failures
3. **Use optimistic updates** - Provide immediate feedback for user actions
4. **Respect user preferences** - Always check notification settings before showing UI
5. **Performance monitoring** - Monitor query performance and cache usage
6. **Accessibility first** - Ensure screen reader compatibility and keyboard navigation
7. **Real-time responsiveness** - Use WebSocket subscriptions for live updates
8. **Mobile optimization** - Consider touch interactions and responsive design

This guide provides everything needed to integrate notifications into your React application using the Belong Platform. All components are TypeScript-ready and follow React best practices.