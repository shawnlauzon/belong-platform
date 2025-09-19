import { ConversationType } from './types';

export const conversationKeys = {
  all: ['conversations'] as const,
  lists: () => [...conversationKeys.all, 'list'] as const,
  list: (type?: ConversationType) =>
    [...conversationKeys.lists(), type] as const,
  details: () => [...conversationKeys.all, 'detail'] as const,
  detail: (conversationId: string) =>
    [...conversationKeys.details(), conversationId] as const,
} as const;

export const messageKeys = {
  all: ['messages'] as const,
  lists: () => [...messageKeys.all, 'list'] as const,
  list: (conversationId: string) =>
    [...messageKeys.all, 'messages', conversationId] as const,
  unreadCount: (conversationId: string) =>
    [...messageKeys.all, 'unread-count', conversationId] as const,
  blockedUsers: () => [...messageKeys.all, 'blocked-users'] as const,
  conversation: (conversationId: string) =>
    [...messageKeys.all, 'conversation', conversationId] as const,
  conversationList: () => [...messageKeys.all, 'conversation-list'] as const,
} as const;
