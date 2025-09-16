import { ConversationListFilters } from './types';

export const conversationKeys = {
  all: ['conversations'] as const,
  lists: () => [...conversationKeys.all, 'list'] as const,
  list: (filters: ConversationListFilters) =>
    [...conversationKeys.lists(), filters] as const,
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
} as const;
