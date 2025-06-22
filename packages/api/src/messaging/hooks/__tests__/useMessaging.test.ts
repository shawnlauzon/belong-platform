import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMessaging } from '../useMessaging';
import { createMessagingService } from '../../services/messaging.service';
import { createWrapper } from '../../../test-utils';

// Mock the service
vi.mock('../../services/messaging.service');

// Mock useSupabase hook
vi.mock('../../../auth/providers/CurrentUserProvider', () => ({
  useSupabase: vi.fn(() => ({}))
}));

import { useSupabase } from '../../../auth/providers/CurrentUserProvider';

const mockUseSupabase = vi.mocked(useSupabase);
const mockCreateMessagingService = vi.mocked(createMessagingService);

describe('useMessaging', () => {
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
      unreadCount: 1
    }
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
      updatedAt: new Date('2024-01-01T00:00:00Z')
    }
  ];

  const mockService = {
    fetchConversations: vi.fn(),
    fetchMessages: vi.fn(),
    sendMessage: vi.fn(),
    markAsRead: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mocks
    mockUseSupabase.mockReturnValue({} as any);
    mockCreateMessagingService.mockReturnValue(mockService);
  });

  describe('conversations query', () => {
    it('should fetch conversations successfully', async () => {
      mockService.fetchConversations.mockResolvedValue(mockConversations);

      const { result } = renderHook(
        () => useMessaging(userId),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.conversations).toEqual(mockConversations);
      expect(mockService.fetchConversations).toHaveBeenCalledWith(userId, undefined);
    });

    it('should be disabled when userId is not provided', () => {
      const { result } = renderHook(
        () => useMessaging(),
        { wrapper: createWrapper() }
      );

      // When disabled, query should not be fetching and not have called the service
      expect(result.current.conversations).toBeUndefined();
      expect(mockService.fetchConversations).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Failed to fetch conversations');
      mockService.fetchConversations.mockRejectedValue(error);

      const { result } = renderHook(
        () => useMessaging(userId),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.error).toEqual(error);
      });
    });
  });

  describe('getConversations with filters', () => {
    it('should call service with filters', async () => {
      const filters = { hasUnread: true };
      mockService.fetchConversations.mockResolvedValue(mockConversations);

      const { result } = renderHook(
        () => {
          const messaging = useMessaging(userId);
          return messaging.getConversations(filters);
        },
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isPending).toBe(false);
      });

      expect(mockService.fetchConversations).toHaveBeenCalledWith(userId, filters);
    });
  });

  describe('getMessages', () => {
    it('should fetch messages for conversation', async () => {
      const conversationId = '123e4567-e89b-12d3-a456-426614174001';
      mockService.fetchMessages.mockResolvedValue(mockMessages);

      const { result } = renderHook(
        () => {
          const messaging = useMessaging(userId);
          return messaging.getMessages(conversationId);
        },
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isPending).toBe(false);
      });

      expect(result.current.data).toEqual(mockMessages);
      expect(mockService.fetchMessages).toHaveBeenCalledWith(conversationId, undefined);
    });

    it('should be disabled when conversationId is not provided', () => {
      const { result } = renderHook(
        () => {
          const messaging = useMessaging(userId);
          return messaging.getMessages('');
        },
        { wrapper: createWrapper() }
      );

      expect(result.current.isFetching).toBe(false);
      expect(mockService.fetchMessages).not.toHaveBeenCalled();
    });
  });

  describe('sendMessage mutation', () => {
    it('should send message successfully', async () => {
      const newMessage = mockMessages[0];
      const messageData = {
        conversationId: '123e4567-e89b-12d3-a456-426614174001',
        senderId: userId,
        content: 'Hello there!'
      };

      mockService.sendMessage.mockResolvedValue(newMessage);
      mockService.fetchConversations.mockResolvedValue(mockConversations);

      const { result } = renderHook(
        () => useMessaging(userId),
        { wrapper: createWrapper() }
      );

      await result.current.sendMessage(messageData);

      expect(mockService.sendMessage).toHaveBeenCalledWith(messageData);
      expect(result.current.isSending).toBe(false);
    });

    it('should handle send errors', async () => {
      const error = new Error('Failed to send message');
      mockService.sendMessage.mockRejectedValue(error);

      const { result } = renderHook(
        () => useMessaging(userId),
        { wrapper: createWrapper() }
      );

      await expect(result.current.sendMessage({
        conversationId: 'conv-1',
        senderId: userId,
        content: 'Test'
      })).rejects.toThrow(error);
    });
  });

  describe('markAsRead mutation', () => {
    it('should mark message as read successfully', async () => {
      const messageId = 'msg-1';
      mockService.markAsRead.mockResolvedValue(undefined);
      mockService.fetchConversations.mockResolvedValue(mockConversations);

      const { result } = renderHook(
        () => useMessaging(userId),
        { wrapper: createWrapper() }
      );

      await result.current.markAsRead(messageId);

      expect(mockService.markAsRead).toHaveBeenCalledWith(messageId);
      expect(result.current.isMarkingAsRead).toBe(false);
    });

    it('should handle markAsRead errors', async () => {
      const error = new Error('Failed to mark as read');
      mockService.markAsRead.mockRejectedValue(error);

      const { result } = renderHook(
        () => useMessaging(userId),
        { wrapper: createWrapper() }
      );

      await expect(result.current.markAsRead('msg-1')).rejects.toThrow(error);
    });
  });

  describe('sync mutations', () => {
    it('should provide sync versions of mutations', async () => {
      mockService.sendMessage.mockResolvedValue(mockMessages[0]);
      mockService.markAsRead.mockResolvedValue(undefined);

      const { result } = renderHook(
        () => useMessaging(userId),
        { wrapper: createWrapper() }
      );

      // These should not throw (they don't return promises)
      expect(() => {
        result.current.sendMessageSync({
          conversationId: 'conv-1',
          senderId: userId,
          content: 'Test'
        });
        result.current.markAsReadSync('msg-1');
      }).not.toThrow();
    });
  });
});