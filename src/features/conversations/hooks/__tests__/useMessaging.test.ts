import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMessaging } from '../useMessaging';
import { createConversationsService } from '../../services/conversations.service';
import { createWrapper } from '../../../../shared/__tests__/';

// Mock shared utilities including useSupabase and logger
vi.mock('../../../../shared', () => {
  const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  return {
    useSupabase: vi.fn(),
    logger: mockLogger,
    queryKeys: {
      conversations: {
        all: ['conversations'],
        list: (userId: string) => ['conversations', 'list', userId],
        byId: (id: string) => ['conversation', id],
        messages: (conversationId: string) => [
          'conversations',
          'messages',
          conversationId,
        ],
        userList: (userId: string) => ['user', userId, 'conversations'],
      },
    },
  };
});

// Mock the service
vi.mock('../../services/conversations.service');

import { useSupabase } from '../../../../shared';

const mockUseSupabase = vi.mocked(useSupabase);
const mockCreateConversationsService = vi.mocked(createConversationsService);

describe.skip('useMessaging', () => {
  const userId = '123e4567-e89b-12d3-a456-426614174000';

  const mockConversations = [
    {
      id: '123e4567-e89b-12d3-a456-426614174001',
      participant1Id: userId,
      participant2Id: 'other-user',
      lastActivityAt: new Date('2024-01-01T00:00:00Z'),
      lastMessageId: 'msg-1',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      lastMessagePreview: 'Hello there!',
      unreadCount: 1,
    },
  ];

  const mockMessages = [
    {
      id: 'msg-1',
      conversationId: '123e4567-e89b-12d3-a456-426614174001',
      fromUserId: 'other-user',
      toUserId: userId,
      content: 'Hello there!',
      readAt: null,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
    },
  ];

  const mockService = {
    fetchConversations: vi.fn(),
    fetchMessages: vi.fn(),
    sendMessage: vi.fn(),
    markAsRead: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mocks
    mockUseSupabase.mockReturnValue({} as any);
    mockCreateConversationsService.mockReturnValue(mockService);
  });

  describe.skip('conversations query', () => {
    it.skip('should fetch conversations successfully', async () => {
      mockService.fetchConversations.mockResolvedValue(mockConversations);

      const { result } = renderHook(() => useMessaging(userId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.conversations).toEqual(mockConversations);
      expect(mockService.fetchConversations).toHaveBeenCalledWith(userId);
    });

    it.skip('should be disabled when userId is not provided', () => {
      const { result } = renderHook(() => useMessaging(), {
        wrapper: createWrapper(),
      });

      // When disabled, query should not be fetching and not have called the service
      expect(result.current.conversations).toBeUndefined();
      expect(mockService.fetchConversations).not.toHaveBeenCalled();
    });

    it.skip('should handle errors gracefully', async () => {
      const error = new Error('Failed to fetch conversations');
      mockService.fetchConversations.mockRejectedValue(error);

      const { result } = renderHook(() => useMessaging(userId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.error).toEqual(error);
      });
    });
  });

  describe.skip('sendMessage mutation', () => {
    it.skip('should send message successfully', async () => {
      const newMessage = mockMessages[0];
      const messageData = {
        conversationId: '123e4567-e89b-12d3-a456-426614174001',
        senderId: userId,
        content: 'Hello there!',
      };

      mockService.sendMessage.mockResolvedValue(newMessage);
      mockService.fetchConversations.mockResolvedValue(mockConversations);

      const { result } = renderHook(() => useMessaging(userId), {
        wrapper: createWrapper(),
      });

      await result.current.sendMessage(messageData);

      expect(mockService.sendMessage).toHaveBeenCalledWith(messageData);
      expect(result.current.isSending).toBe(false);
    });

    it.skip('should handle send errors', async () => {
      const error = new Error('Failed to send message');
      mockService.sendMessage.mockRejectedValue(error);

      const { result } = renderHook(() => useMessaging(userId), {
        wrapper: createWrapper(),
      });

      await expect(
        result.current.sendMessage({
          conversationId: 'conv-1',
          senderId: userId,
          content: 'Test',
        })
      ).rejects.toThrow(error);
    });
  });

  describe.skip('markAsRead mutation', () => {
    it.skip('should mark message as read successfully', async () => {
      const messageId = 'msg-1';
      mockService.markAsRead.mockResolvedValue(undefined);
      mockService.fetchConversations.mockResolvedValue(mockConversations);

      const { result } = renderHook(() => useMessaging(userId), {
        wrapper: createWrapper(),
      });

      await result.current.markAsRead(messageId);

      expect(mockService.markAsRead).toHaveBeenCalledWith(messageId);
      expect(result.current.isMarkingAsRead).toBe(false);
    });

    it.skip('should handle markAsRead errors', async () => {
      const error = new Error('Failed to mark as read');
      mockService.markAsRead.mockRejectedValue(error);

      const { result } = renderHook(() => useMessaging(userId), {
        wrapper: createWrapper(),
      });

      await expect(result.current.markAsRead('msg-1')).rejects.toThrow(error);
    });
  });
});
