// Types
export type * from './types';

// API
export {
  fetchNotifications,
  fetchNotificationCount,
  deleteNotification,
  updatePreferences,
  fetchPreferences,
} from './api';
export { markAsRead as markNotificationAsRead } from './api/markAsRead';
export { markAllAsRead as markAllNotificationsAsRead } from './api/markAllAsRead';

// Hooks
export {
  useNotifications,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from './hooks';
export { useMarkAsRead as useMarkNotificationAsRead } from './hooks/useMarkAsRead';
export { useMarkAllAsRead as useMarkAllNotificationsAsRead } from './hooks/useMarkAllAsRead';

// Transformers
export { transformNotification } from './transformers';

// Queries
export { notificationKeys } from './queries';

// Providers
export { NotificationRealtimeProvider } from './providers/NotificationRealtimeProvider';
