export const messageKeys = {
  all: ['messages'] as const,
  conversationList: () => [...messageKeys.all, 'conversations'] as const,
  conversation: (id: string) => [...messageKeys.conversationList(), id] as const,
  list: (conversationId: string) => [...messageKeys.all, 'messages', conversationId] as const,
  blockedUsers: () => [...messageKeys.all, 'blocked'] as const,
  unreadCount: () => [...messageKeys.all, 'unread'] as const,
} as const;