import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createNotificationService } from '../notification.service';
import type { BelongClient } from '@belongnetwork/core';
import { fetchUserById } from '../../../users/impl/fetchUserById';

// Mock dependencies
vi.mock('../../../users/impl/fetchUserById');
const mockFetchUserById = vi.mocked(fetchUserById);

describe('createNotificationService', () => {
  const mockSupabase = {
    from: vi.fn(() => mockSupabase),
    select: vi.fn(() => mockSupabase),
    eq: vi.fn(() => mockSupabase),
    gte: vi.fn(() => mockSupabase),
    order: vi.fn(() => mockSupabase),
    range: vi.fn(() => mockSupabase),
    single: vi.fn(() => mockSupabase),
    insert: vi.fn(() => mockSupabase),
    update: vi.fn(() => mockSupabase),
    delete: vi.fn(() => mockSupabase),
  };

  const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  };

  const mockClient: BelongClient = {
    supabase: mockSupabase as any,
    logger: mockLogger as any,
  };

  const service = createNotificationService(mockClient);
  const userId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchNotifications', () => {
    const mockDbNotifications = [
      {
        id: '123e4567-e89b-12d3-a456-426614174001',
        user_id: userId,
        type: 'message',
        title: 'New message',
        content: 'You have a new message',
        data: { sender_id: 'sender-123' },
        read: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: '123e4567-e89b-12d3-a456-426614174002',
        user_id: userId,
        type: 'system',
        title: 'System update',
        content: 'System maintenance completed',
        data: {},
        read: true,
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z'
      }
    ];

    it('should fetch notifications successfully', async () => {
      mockSupabase.range.mockResolvedValue({
        data: mockDbNotifications,
        error: null
      });

      const result = await service.fetchNotifications(userId);

      expect(mockSupabase.from).toHaveBeenCalledWith('notifications');
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', userId);
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: '123e4567-e89b-12d3-a456-426614174001',
        userId,
        type: 'message',
        title: 'New message',
        content: 'You have a new message',
        read: false
      });
    });

    it('should apply type filter', async () => {
      mockSupabase.range.mockResolvedValue({
        data: mockDbNotifications,
        error: null
      });

      await service.fetchNotifications(userId, { type: 'message' });

      expect(mockSupabase.eq).toHaveBeenCalledWith('type', 'message');
    });

    it('should apply read filter', async () => {
      mockSupabase.range.mockResolvedValue({
        data: mockDbNotifications,
        error: null
      });

      await service.fetchNotifications(userId, { read: false });

      expect(mockSupabase.eq).toHaveBeenCalledWith('read', false);
    });

    it('should apply since filter', async () => {
      mockSupabase.range.mockResolvedValue({
        data: mockDbNotifications,
        error: null
      });

      const since = new Date('2024-01-01T12:00:00Z');
      await service.fetchNotifications(userId, { since });

      expect(mockSupabase.gte).toHaveBeenCalledWith('created_at', since.toISOString());
    });

    it('should apply pagination', async () => {
      mockSupabase.range.mockResolvedValue({
        data: mockDbNotifications,
        error: null
      });

      await service.fetchNotifications(userId, { page: 2, pageSize: 10 });

      expect(mockSupabase.range).toHaveBeenCalledWith(10, 19); // offset 10, limit 10
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockSupabase.range.mockResolvedValue({
        data: null,
        error: dbError
      });

      await expect(service.fetchNotifications(userId)).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle empty results', async () => {
      mockSupabase.range.mockResolvedValue({
        data: [],
        error: null
      });

      const result = await service.fetchNotifications(userId);
      expect(result).toEqual([]);
    });
  });

  describe('fetchNotificationById', () => {
    const notificationId = '123e4567-e89b-12d3-a456-426614174001';
    const mockDbNotification = {
      id: notificationId,
      user_id: userId,
      type: 'message',
      title: 'New message',
      content: 'You have a new message',
      data: { sender_id: 'sender-123' },
      read: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    it('should fetch notification by ID successfully', async () => {
      mockSupabase.single.mockResolvedValue({
        data: mockDbNotification,
        error: null
      });

      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174003',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      };
      mockFetchUserById.mockResolvedValue(mockUser as any);

      const result = await service.fetchNotificationById(notificationId, userId);

      expect(mockSupabase.from).toHaveBeenCalledWith('notifications');
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', notificationId);
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', userId);
      expect(result).toMatchObject({
        id: notificationId,
        userId,
        type: 'message',
        title: 'New message',
        sender: mockUser
      });
    });

    it('should return null when notification not found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' } // Not found
      });

      const result = await service.fetchNotificationById(notificationId, userId);
      expect(result).toBe(null);
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: dbError
      });

      await expect(service.fetchNotificationById(notificationId, userId)).rejects.toThrow(dbError);
    });

    it('should not fetch sender when senderId not in data', async () => {
      const notificationWithoutSender = {
        ...mockDbNotification,
        data: {}
      };

      mockSupabase.single.mockResolvedValue({
        data: notificationWithoutSender,
        error: null
      });

      const result = await service.fetchNotificationById(notificationId, userId);

      expect(mockFetchUserById).not.toHaveBeenCalled();
      expect(result?.sender).toBeUndefined();
    });
  });

  describe('createNotification', () => {
    const notificationData = {
      userId,
      type: 'message' as const,
      title: 'New message',
      content: 'You have a new message',
      data: { senderId: 'sender-123' }
    };

    it('should create notification successfully', async () => {
      const createdNotification = {
        id: '123e4567-e89b-12d3-a456-426614174001',
        user_id: userId,
        type: 'message',
        title: 'New message',
        content: 'You have a new message',
        data: { sender_id: 'sender-123' },
        read: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      // Set up the chain: from -> insert -> select -> single
      const singleMock = vi.fn().mockResolvedValue({
        data: createdNotification,
        error: null
      });
      const selectMock = vi.fn(() => ({ single: singleMock }));
      const insertMock = vi.fn(() => ({ select: selectMock }));
      mockSupabase.from.mockReturnValue({ insert: insertMock });

      const result = await service.createNotification(notificationData);

      expect(mockSupabase.from).toHaveBeenCalledWith('notifications');
      expect(insertMock).toHaveBeenCalled();
      expect(result).toMatchObject({
        id: createdNotification.id,
        userId,
        type: 'message',
        title: 'New message'
      });
    });

    it('should validate input data', async () => {
      const invalidData = {
        userId: 'invalid-uuid',
        type: 'invalid-type',
        title: ''
      };

      await expect(service.createNotification(invalidData)).rejects.toThrow();
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      
      const singleMock = vi.fn().mockResolvedValue({
        data: null,
        error: dbError
      });
      const selectMock = vi.fn(() => ({ single: singleMock }));
      const insertMock = vi.fn(() => ({ select: selectMock }));
      mockSupabase.from.mockReturnValue({ insert: insertMock });

      await expect(service.createNotification(notificationData)).rejects.toThrow(dbError);
    });
  });

  describe('markNotificationRead', () => {
    const notificationId = '123e4567-e89b-12d3-a456-426614174001';

    it('should mark notification as read successfully', async () => {
      // Mock the final result of the chain
      const finalMock = {
        data: {},
        error: null
      };
      
      // Set up the chain: from -> update -> eq -> eq -> final result
      const eqMock = vi.fn().mockResolvedValue(finalMock);
      const eq1Mock = vi.fn(() => ({ eq: eqMock }));
      const updateMock = vi.fn(() => ({ eq: eq1Mock }));
      mockSupabase.from.mockReturnValue({ update: updateMock });

      await service.markNotificationRead(notificationId, userId);

      expect(mockSupabase.from).toHaveBeenCalledWith('notifications');
      expect(updateMock).toHaveBeenCalledWith({ read: true });
      expect(eq1Mock).toHaveBeenCalledWith('id', notificationId);
      expect(eqMock).toHaveBeenCalledWith('user_id', userId);
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      const finalMock = {
        data: null,
        error: dbError
      };
      
      const eqMock = vi.fn().mockResolvedValue(finalMock);
      const eq1Mock = vi.fn(() => ({ eq: eqMock }));
      const updateMock = vi.fn(() => ({ eq: eq1Mock }));
      mockSupabase.from.mockReturnValue({ update: updateMock });

      await expect(service.markNotificationRead(notificationId, userId)).rejects.toThrow(dbError);
    });
  });

  describe('markAllNotificationsRead', () => {
    it('should mark all notifications as read successfully', async () => {
      const finalMock = {
        data: {},
        error: null
      };
      
      const eqMock = vi.fn().mockResolvedValue(finalMock);
      const eq1Mock = vi.fn(() => ({ eq: eqMock }));
      const updateMock = vi.fn(() => ({ eq: eq1Mock }));
      mockSupabase.from.mockReturnValue({ update: updateMock });

      await service.markAllNotificationsRead(userId);

      expect(mockSupabase.from).toHaveBeenCalledWith('notifications');
      expect(updateMock).toHaveBeenCalledWith({ read: true });
      expect(eq1Mock).toHaveBeenCalledWith('user_id', userId);
      expect(eqMock).toHaveBeenCalledWith('read', false);
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      const finalMock = {
        data: null,
        error: dbError
      };
      
      const eqMock = vi.fn().mockResolvedValue(finalMock);
      const eq1Mock = vi.fn(() => ({ eq: eqMock }));
      const updateMock = vi.fn(() => ({ eq: eq1Mock }));
      mockSupabase.from.mockReturnValue({ update: updateMock });

      await expect(service.markAllNotificationsRead(userId)).rejects.toThrow(dbError);
    });
  });

  describe('deleteNotification', () => {
    const notificationId = '123e4567-e89b-12d3-a456-426614174001';

    it('should delete notification successfully', async () => {
      const finalMock = {
        data: {},
        error: null
      };
      
      const eqMock = vi.fn().mockResolvedValue(finalMock);
      const eq1Mock = vi.fn(() => ({ eq: eqMock }));
      const deleteMock = vi.fn(() => ({ eq: eq1Mock }));
      mockSupabase.from.mockReturnValue({ delete: deleteMock });

      await service.deleteNotification(notificationId, userId);

      expect(mockSupabase.from).toHaveBeenCalledWith('notifications');
      expect(deleteMock).toHaveBeenCalled();
      expect(eq1Mock).toHaveBeenCalledWith('id', notificationId);
      expect(eqMock).toHaveBeenCalledWith('user_id', userId);
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      const finalMock = {
        data: null,
        error: dbError
      };
      
      const eqMock = vi.fn().mockResolvedValue(finalMock);
      const eq1Mock = vi.fn(() => ({ eq: eqMock }));
      const deleteMock = vi.fn(() => ({ eq: eq1Mock }));
      mockSupabase.from.mockReturnValue({ delete: deleteMock });

      await expect(service.deleteNotification(notificationId, userId)).rejects.toThrow(dbError);
    });
  });
});