// Re-export all types from all notification type files
export type * from './notification';
export type * from './notificationDetail';
export type * from './notificationRow';
export type * from './notificationCount';
export type * from './notificationPreferences';
export type * from './notificationMetadata';

// Re-export utility functions that are not types
export {
  getTypedMetadata,
  hasMetadata
} from './notificationMetadata';