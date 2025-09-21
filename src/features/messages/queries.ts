export const conversationKeys = {
  all: ['conversations'] as const,
  lists: () => [...conversationKeys.all, 'list'] as const,
  list: () => [...conversationKeys.all, 'list'] as const,
  conversations: () => [...conversationKeys.lists(), 'conversations'] as const,
  detail: (conversationId: string) => [...conversationKeys.all, 'detail', conversationId] as const,
  communityChats: () => [...conversationKeys.all, 'community-chats'] as const,
  messages: (conversationId: string) =>
    [...conversationKeys.conversations(), conversationId] as const,
  unreadCount: (conversationId: string) =>
    [
      ...conversationKeys.conversations(),
      'unread-count',
      conversationId,
    ] as const,
  totalUnreadCount: () =>
    [...conversationKeys.conversations(), 'total-unread-count'] as const,
} as const;

export const communityChatKeys = {
  all: ['community-chats'] as const,
  lists: () => [...communityChatKeys.all, 'list'] as const,
  chats: () => [...communityChatKeys.lists(), 'chats'] as const,
  messages: (communityId: string) =>
    [...communityChatKeys.chats(), communityId] as const,
  unreadCount: (communityId: string) =>
    [...communityChatKeys.messages(communityId), 'unread-count'] as const,
  totalUnreadCount: () =>
    [...communityChatKeys.chats(), 'total-unread-count'] as const,
} as const;

export const messageKeys = {
  all: ['messages'] as const,
  lists: () => [...messageKeys.all, 'list'] as const,
  list: (conversationId: string) => [...messageKeys.all, 'list', conversationId] as const,
  blockedUsers: () => [...messageKeys.all, 'blocked-users'] as const,
  communityMessages: (communityId: string) => [...messageKeys.all, 'community', communityId] as const,
  communityUnreadCount: (communityId: string) => [...messageKeys.all, 'community', communityId, 'unread-count'] as const,
  totalCommunityUnreadCount: () => [...messageKeys.all, 'community', 'total-unread-count'] as const,
  unreadCount: (conversationId: string) => [...messageKeys.all, 'unread-count', conversationId] as const,
  totalUnreadCount: () => [...messageKeys.all, 'total-unread-count'] as const,
} as const;
