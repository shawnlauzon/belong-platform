export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (filter: {
    type?: string;
    isRead?: boolean;
    limit?: number;
    offset?: number;
  } = {}) => [...notificationKeys.lists(), filter] as const,
  counts: () => [...notificationKeys.all, 'counts'] as const,
  preferences: () => [...notificationKeys.all, 'preferences'] as const,
};