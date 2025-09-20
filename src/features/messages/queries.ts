export const conversationKeys = {
  all: ['conversations'] as const,
  lists: () => [...conversationKeys.all, 'list'] as const,
  list: () => [...conversationKeys.lists()] as const,
  communityChats: () => [...conversationKeys.all, 'community-chats'] as const,
  details: () => [...conversationKeys.all, 'detail'] as const,
  detail: (conversationId: string) =>
    [...conversationKeys.details(), conversationId] as const,
} as const;

export const messageKeys = {
  all: ['messages'] as const,
  lists: () => [...messageKeys.all, 'list'] as const,
  list: (conversationId: string) =>
    [...messageKeys.all, 'messages', conversationId] as const,
  communityMessages: (communityId: string) =>
    [...messageKeys.all, 'community-messages', communityId] as const,
  unreadCount: (conversationId: string) =>
    [...messageKeys.all, 'unread-count', conversationId] as const,
  communityUnreadCount: (communityId: string) =>
    [...messageKeys.all, 'community-unread-count', communityId] as const,
  totalUnreadCount: () => [...messageKeys.all, 'total-unread-count'] as const,
  totalCommunityUnreadCount: () =>
    [...messageKeys.all, 'total-community-unread-count'] as const,
  blockedUsers: () => [...messageKeys.all, 'blocked-users'] as const,
} as const;
