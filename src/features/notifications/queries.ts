export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (userId: string) =>
    [...notificationKeys.lists(), 'user', userId] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
  counts: () => [...notificationKeys.all, 'counts'] as const,
  preferences: () => [...notificationKeys.all, 'preferences'] as const,
};
