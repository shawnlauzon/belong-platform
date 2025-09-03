// Types
export type {
  Notification,
  NotificationInput,
  NotificationRow,
  NotificationInsertDbData,
  NotificationUpdateDbData,
  NotificationRowJoinActor,
  NotificationCounts,
  NotificationPreferences,
} from './types';

// API
export {
  fetchNotifications,
  fetchNotificationCounts,
  deleteNotification,
  updatePreferences,
} from './api';
export { markAsRead as markNotificationAsRead } from './api/markAsRead';
export { markAllAsRead as markAllNotificationsAsRead } from './api/markAllAsRead';

// Hooks
export {
  useNotifications,
  useNotificationCount,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from './hooks';
export { useMarkAsRead as useMarkNotificationAsRead } from './hooks/useMarkAsRead';
export { useMarkAllAsRead as useMarkAllNotificationsAsRead } from './hooks/useMarkAllAsRead';

// Transformers
export { notificationTransformer } from './transformers';

// Queries
export { notificationKeys } from './queries';