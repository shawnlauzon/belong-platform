import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import type { ConversationInfo, Conversation } from '../../types';
import { useConversations } from '../useConversations';

// Mock the auth provider
vi.mock('../../../../config', () => ({
  useSupabase: vi.fn(),
}));

// Mock the conversation service
vi.mock('../../services/conversations.service', () => ({
  createConversationsService: vi.fn(),
}));

import { useSupabase } from '../../../../config';
import { createConversationsService } from '../../services/conversations.service';

const mockUseSupabase = vi.mocked(useSupabase);
const mockCreateConversationsService = vi.mocked(createConversationsService);
const mockFetchConversations = vi.fn();

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

      // Assert - list method works
      const conversations = await result.current.list();
      expect(conversations).toEqual(mockConversationData);
      expect(mockFetchConversations).toHaveBeenCalledTimes(1);
    });
  });
});
