export const conversationKeys = {
  all: ['conversations'] as const,
  lists: () => [...conversationKeys.all, 'list'] as const,
  conversations: () => [...conversationKeys.lists(), 'conversations'] as const,
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
