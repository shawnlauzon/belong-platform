export const conversationKeys = {
  all: ['conversations'] as const,
  lists: () => [...conversationKeys.all, 'list'] as const,
  list: () => [...conversationKeys.lists(), 'conversations'] as const,
  messages: (conversationId: string) =>
    [...conversationKeys.list(), conversationId] as const,
  unreadCount: (conversationId: string) =>
    [...conversationKeys.messages(conversationId), 'unread-count'] as const,
  totalUnreadCount: () =>
    [...conversationKeys.all, 'total-unread-count'] as const,
} as const;

export const communityChatKeys = {
  all: ['community-chats'] as const,
  lists: () => [...communityChatKeys.all, 'list'] as const,
  list: () => [...communityChatKeys.lists(), 'chats'] as const,
  messages: (communityId: string) =>
    [...communityChatKeys.list(), communityId] as const,
  unreadCount: (communityId: string) =>
    [...communityChatKeys.messages(communityId), 'unread-count'] as const,
  totalUnreadCount: () =>
    [...communityChatKeys.all, 'total-unread-count'] as const,
} as const;

export const messageKeys = {
  all: ['messages'] as const,
  lists: () => [...messageKeys.all, 'list'] as const,
  blockedUsers: () => [...messageKeys.all, 'blocked-users'] as const,
} as const;
