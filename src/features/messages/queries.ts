export const messageKeys = {
  all: ['messages'] as const,
  conversations: () => [...messageKeys.all, 'conversations'] as const,
  conversation: (id: string) => [...messageKeys.conversations(), id] as const,
  messages: (conversationId: string) => [...messageKeys.all, 'messages', conversationId] as const,
  blockedUsers: () => [...messageKeys.all, 'blocked'] as const,
  unreadCount: () => [...messageKeys.all, 'unread'] as const,
} as const;