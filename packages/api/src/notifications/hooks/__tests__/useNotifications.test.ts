import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useNotifications } from '../useNotifications';
import { createNotificationService } from '../../services/notification.service';
import { createWrapper } from '../../../test-utils';

// Mock the service
vi.mock('../../services/notification.service');

// Mock useClient hook
vi.mock('../../../auth/providers/CurrentUserProvider', () => ({
  useClient: vi.fn(() => ({
    supabase: {},
    logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn() }
  }))
}));
const mockCreateNotificationService = vi.mocked(createNotificationService);

describe('useNotifications', () => {
  const userId = '123e4567-e89b-12d3-a456-426614174000';
  
  const mockNotifications = [
    {
      id: '123e4567-e89b-12d3-a456-426614174001',
      userId,
      type: 'message' as const,
      title: 'New message',
      content: 'You have a new message',
      read: false,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      senderId: 'sender-123'
    },
    {
      id: '123e4567-e89b-12d3-a456-426614174002',
      userId,
      type: 'system' as const,
      title: 'System update',
      content: 'System maintenance completed',
      read: true,
      createdAt: new Date('2024-01-02T00:00:00Z'),
      updatedAt: new Date('2024-01-02T00:00:00Z')
    }
  ];

  const mockNotificationWithRelations = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    userId,
    type: 'message' as const,
    title: 'New message',
    content: 'You have a new message',
    read: false,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    sender: {
      id: 'sender-123',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com'
    }
  };

  const mockService = {
    fetchNotifications: vi.fn(),
    fetchNotificationById: vi.fn(),
    createNotification: vi.fn(),
    markNotificationRead: vi.fn(),
    markAllNotificationsRead: vi.fn(),
    deleteNotification: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateNotificationService.mockReturnValue(mockService);
  });

  describe('notifications query', () => {
    it('should fetch notifications successfully', async () => {
      mockService.fetchNotifications.mockResolvedValue(mockNotifications);

      const { result } = renderHook(
        () => useNotifications(userId),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.notifications).toEqual(mockNotifications);
      expect(mockService.fetchNotifications).toHaveBeenCalledWith(userId);
    });

    it('should be disabled when userId is not provided', () => {
      const { result } = renderHook(
        () => useNotifications(),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(false);
      expect(mockService.fetchNotifications).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Failed to fetch notifications');
      mockService.fetchNotifications.mockRejectedValue(error);

      const { result } = renderHook(
        () => useNotifications(userId),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.error).toEqual(error);
      });
    });

    it('should calculate unread count correctly', async () => {
      mockService.fetchNotifications.mockResolvedValue(mockNotifications);

      const { result } = renderHook(
        () => useNotifications(userId),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.unreadCount).toBe(1);
        expect(result.current.hasUnread).toBe(true);
      });
    });

    it('should handle empty notifications list', async () => {
      mockService.fetchNotifications.mockResolvedValue([]);

      const { result } = renderHook(
        () => useNotifications(userId),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.notifications).toEqual([]);
        expect(result.current.unreadCount).toBe(0);
        expect(result.current.hasUnread).toBe(false);
      });
    });
  });

  describe('getNotifications with filters', () => {
    it('should call service with filters', async () => {
      const filters = { type: 'message' as const, read: false };
      mockService.fetchNotifications.mockResolvedValue(mockNotifications);

      const { result } = renderHook(
        () => {
          const notifications = useNotifications(userId);
          return notifications.getNotifications(filters);
        },
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockService.fetchNotifications).toHaveBeenCalledWith(userId, filters);
    });
  });

  describe('getNotification by ID', () => {
    it('should fetch single notification', async () => {
      const notificationId = '123e4567-e89b-12d3-a456-426614174001';
      mockService.fetchNotificationById.mockResolvedValue(mockNotificationWithRelations);

      const { result } = renderHook(
        () => {
          const notifications = useNotifications(userId);
          return notifications.getNotification(notificationId);
        },
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockNotificationWithRelations);
      expect(mockService.fetchNotificationById).toHaveBeenCalledWith(notificationId, userId);
    });

    it('should be disabled when notificationId is not provided', () => {
      const { result } = renderHook(
        () => {
          const notifications = useNotifications(userId);
          return notifications.getNotification('');
        },
        { wrapper: createWrapper() }
      );

      // When disabled, query should not be fetching and not have called the service
      expect(result.current.isFetching).toBe(false);
      expect(mockService.fetchNotificationById).not.toHaveBeenCalled();
    });
  });

  describe('create mutation', () => {
    it('should create notification successfully', async () => {
      const newNotification = mockNotifications[0];
      const createData = {
        userId,
        type: 'message' as const,
        title: 'New message',
        content: 'You have a new message'
      };

      mockService.createNotification.mockResolvedValue(newNotification);
      mockService.fetchNotifications.mockResolvedValue(mockNotifications);

      const { result } = renderHook(
        () => useNotifications(userId),
        { wrapper: createWrapper() }
      );

      await result.current.create(createData);

      expect(mockService.createNotification).toHaveBeenCalledWith(createData);
      expect(result.current.isCreating).toBe(false);
    });

    it('should handle create errors', async () => {
      const error = new Error('Failed to create notification');
      mockService.createNotification.mockRejectedValue(error);

      const { result } = renderHook(
        () => useNotifications(userId),
        { wrapper: createWrapper() }
      );

      await expect(result.current.create({
        userId,
        type: 'message',
        title: 'Test'
      })).rejects.toThrow(error);
    });
  });

  describe('markAsRead mutation', () => {
    it('should mark notification as read successfully', async () => {
      const notificationId = '123e4567-e89b-12d3-a456-426614174001';
      mockService.markNotificationRead.mockResolvedValue(undefined);
      mockService.fetchNotifications.mockResolvedValue(mockNotifications);

      const { result } = renderHook(
        () => useNotifications(userId),
        { wrapper: createWrapper() }
      );

      await result.current.markAsRead(notificationId);

      expect(mockService.markNotificationRead).toHaveBeenCalledWith(notificationId, userId);
      expect(result.current.isMarkingAsRead).toBe(false);
    });

    it('should handle markAsRead errors', async () => {
      const error = new Error('Failed to mark as read');
      mockService.markNotificationRead.mockRejectedValue(error);

      const { result } = renderHook(
        () => useNotifications(userId),
        { wrapper: createWrapper() }
      );

      await expect(result.current.markAsRead('notification-id')).rejects.toThrow(error);
    });
  });

  describe('markAllAsRead mutation', () => {
    it('should mark all notifications as read successfully', async () => {
      mockService.markAllNotificationsRead.mockResolvedValue(undefined);
      mockService.fetchNotifications.mockResolvedValue(mockNotifications);

      const { result } = renderHook(
        () => useNotifications(userId),
        { wrapper: createWrapper() }
      );

      await result.current.markAllAsRead();

      expect(mockService.markAllNotificationsRead).toHaveBeenCalledWith(userId);
      expect(result.current.isMarkingAllAsRead).toBe(false);
    });

    it('should handle markAllAsRead errors', async () => {
      const error = new Error('Failed to mark all as read');
      mockService.markAllNotificationsRead.mockRejectedValue(error);

      const { result } = renderHook(
        () => useNotifications(userId),
        { wrapper: createWrapper() }
      );

      await expect(result.current.markAllAsRead()).rejects.toThrow(error);
    });
  });

  describe('delete mutation', () => {
    it('should delete notification successfully', async () => {
      const notificationId = '123e4567-e89b-12d3-a456-426614174001';
      mockService.deleteNotification.mockResolvedValue(undefined);
      mockService.fetchNotifications.mockResolvedValue(mockNotifications);

      const { result } = renderHook(
        () => useNotifications(userId),
        { wrapper: createWrapper() }
      );

      await result.current.delete(notificationId);

      expect(mockService.deleteNotification).toHaveBeenCalledWith(notificationId, userId);
      expect(result.current.isDeleting).toBe(false);
    });

    it('should handle delete errors', async () => {
      const error = new Error('Failed to delete notification');
      mockService.deleteNotification.mockRejectedValue(error);

      const { result } = renderHook(
        () => useNotifications(userId),
        { wrapper: createWrapper() }
      );

      await expect(result.current.delete('notification-id')).rejects.toThrow(error);
    });
  });

  describe('sync mutations', () => {
    it('should provide sync versions of mutations', async () => {
      mockService.markNotificationRead.mockResolvedValue(undefined);
      mockService.markAllNotificationsRead.mockResolvedValue(undefined);
      mockService.deleteNotification.mockResolvedValue(undefined);

      const { result } = renderHook(
        () => useNotifications(userId),
        { wrapper: createWrapper() }
      );

      // These should not throw (they don't return promises)
      expect(() => {
        result.current.markAsReadSync('notification-id');
        result.current.markAllAsReadSync();
        result.current.deleteSync('notification-id');
      }).not.toThrow();
    });
  });

  describe('error handling without userId', () => {
    it('should throw error when userId is missing for mutations', async () => {
      const { result } = renderHook(
        () => useNotifications(), // No userId
        { wrapper: createWrapper() }
      );

      await expect(result.current.markAsRead('notification-id')).rejects.toThrow('User ID required');
      await expect(result.current.markAllAsRead()).rejects.toThrow('User ID required');
      await expect(result.current.delete('notification-id')).rejects.toThrow('User ID required');
    });
  });
});