import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import type { ConversationInfo, Conversation, MessageInfo } from '../../types';
import { useConversations } from '../useConversationsConsolidated';

// Mock the auth provider
vi.mock('../../../../config', () => ({
  useSupabase: vi.fn(),
}));

// Mock the conversation service
vi.mock('../../services/conversations.service', () => ({
  createConversationsService: vi.fn(),
}));

import { useSupabase } from '../../../../shared';
import { createConversationsService } from '../../services/conversations.service';

const mockUseSupabase = vi.mocked(useSupabase);
const mockCreateConversationsService = vi.mocked(createConversationsService);
const mockFetchConversations = vi.fn();
// Note: fetchConversationById not implemented yet
const mockFetchMessages = vi.fn();

describe.skip('useConversations consolidated hook', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();

    // Setup mocks
    mockUseSupabase.mockReturnValue({} as any);
    mockCreateConversationsService.mockReturnValue({
      fetchConversations: mockFetchConversations,
      fetchMessages: mockFetchMessages,
    } as any);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  describe('Test #1: Hook structure + list() method', () => {
    it('should provide list method that fetches conversations', async () => {
      // Arrange - mock data
      const mockConversationData: ConversationInfo[] = [
        {
          id: 'conv-1',
          participant1Id: 'user-1',
          participant2Id: 'user-2',
          lastMessageAt: new Date(),
          lastMessagePreview: 'Hello there',
          unreadCount: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockFetchConversations.mockResolvedValue(mockConversationData);

      // Act - render hook
      const { result } = renderHook(() => useConversations(), { wrapper });

      // Assert - hook structure
      expect(result.current).toHaveProperty('list');
      expect(typeof result.current.list).toBe('function');
      // Note: byId method not available since fetchConversationById is not implemented

      // Assert - list method works
      const conversations = await result.current.list();
      expect(conversations).toEqual(mockConversationData);
      expect(mockFetchConversations).toHaveBeenCalledTimes(1);
    });
  });

  // Note: byId() method test removed since fetchConversationById is not implemented yet
  // This test can be added back when the conversations service includes that method

  describe('Test #3: messages() sub-entity method', () => {
    it('should provide messages method that fetches conversation messages', async () => {
      // Arrange - mock messages data
      const mockConversationId = 'conv-1';
      const mockMessagesData: MessageInfo[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          fromUserId: 'user-1',
          toUserId: 'user-2',
          content: 'Hello there!',
          readAt: undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          fromUserId: 'user-2',
          toUserId: 'user-1',
          content: 'Hi back!',
          readAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockFetchMessages.mockResolvedValue(mockMessagesData);

      // Act - render hook
      const { result } = renderHook(() => useConversations(), { wrapper });

      // Assert - hook structure
      expect(result.current).toHaveProperty('messages');
      expect(typeof result.current.messages).toBe('function');

      // Assert - messages method works (following communities.memberships pattern)
      const messages = await result.current.messages(mockConversationId);
      expect(messages).toEqual(mockMessagesData);
      expect(mockFetchMessages).toHaveBeenCalledWith(mockConversationId);
      expect(mockFetchMessages).toHaveBeenCalledTimes(1);
    });
  });
});
