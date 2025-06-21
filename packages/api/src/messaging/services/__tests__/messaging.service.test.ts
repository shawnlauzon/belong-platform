import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMessagingService } from '../messaging.service';
import type { BelongClient } from '@belongnetwork/core';
import { fetchUserById } from '../../../users/impl/fetchUserById';

// Mock dependencies
vi.mock('../../../users/impl/fetchUserById');
const mockFetchUserById = vi.mocked(fetchUserById);

describe('createMessagingService', () => {
  const mockSupabase = {
    from: vi.fn(() => mockSupabase),
    select: vi.fn(() => mockSupabase),
    eq: vi.fn(() => mockSupabase),
    or: vi.fn(() => mockSupabase),
    order: vi.fn(() => mockSupabase),
    range: vi.fn(() => mockSupabase),
    single: vi.fn(() => mockSupabase),
    insert: vi.fn(() => mockSupabase),
    update: vi.fn(() => mockSupabase),
  };

  const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  };

  const mockClient: BelongClient = {
    supabase: mockSupabase as any,
    logger: mockLogger as any,
  };

  const service = createMessagingService(mockClient);
  const userId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchConversations', () => {
    const mockDbConversations = [
      {
        id: '123e4567-e89b-12d3-a456-426614174001',
        participant_1_id: userId,
        participant_2_id: '123e4567-e89b-12d3-a456-426614174002',
        last_message_at: '2024-01-01T00:00:00Z',
        last_message_preview: 'Hello there!',
        unread_count_user1: 0,
        unread_count_user2: 1,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    ];

    it('should fetch conversations successfully', async () => {
      mockSupabase.range.mockResolvedValue({
        data: mockDbConversations,
        error: null
      });

      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174002',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      };
      mockFetchUserById.mockResolvedValue(mockUser as any);

      const result = await service.fetchConversations(userId);

      expect(mockSupabase.from).toHaveBeenCalledWith('conversations');
      expect(mockSupabase.or).toHaveBeenCalledWith(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`);
      expect(mockSupabase.order).toHaveBeenCalledWith('last_message_at', { ascending: false });
      expect(result).toHaveLength(1);
    });

    it('should handle empty results', async () => {
      mockSupabase.range.mockResolvedValue({
        data: [],
        error: null
      });

      const result = await service.fetchConversations(userId);
      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockSupabase.range.mockResolvedValue({
        data: null,
        error: dbError
      });

      await expect(service.fetchConversations(userId)).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('fetchMessages', () => {
    const conversationId = '123e4567-e89b-12d3-a456-426614174001';
    const mockDbMessages = [
      {
        id: '123e4567-e89b-12d3-a456-426614174003',
        conversation_id: conversationId,
        sender_id: userId,
        content: 'Hello there!',
        read_at: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    ];

    it('should fetch messages successfully', async () => {
      mockSupabase.range.mockResolvedValue({
        data: mockDbMessages,
        error: null
      });

      const mockUser = {
        id: userId,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      };
      mockFetchUserById.mockResolvedValue(mockUser as any);

      const result = await service.fetchMessages(conversationId);

      expect(mockSupabase.from).toHaveBeenCalledWith('direct_messages');
      expect(mockSupabase.eq).toHaveBeenCalledWith('conversation_id', conversationId);
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result).toHaveLength(1);
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockSupabase.range.mockResolvedValue({
        data: null,
        error: dbError
      });

      await expect(service.fetchMessages(conversationId)).rejects.toThrow(dbError);
    });
  });

  describe('sendMessage', () => {
    const messageData = {
      conversationId: '123e4567-e89b-12d3-a456-426614174001',
      senderId: userId,
      content: 'Hello there!'
    };

    it('should send message successfully', async () => {
      const createdMessage = {
        id: '123e4567-e89b-12d3-a456-426614174003',
        conversation_id: messageData.conversationId,
        sender_id: messageData.senderId,
        content: messageData.content,
        read_at: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const singleMock = vi.fn().mockResolvedValue({
        data: createdMessage,
        error: null
      });
      const selectMock = vi.fn(() => ({ single: singleMock }));
      const insertMock = vi.fn(() => ({ select: selectMock }));
      mockSupabase.from.mockReturnValue({ insert: insertMock });

      const mockUser = {
        id: userId,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      };
      mockFetchUserById.mockResolvedValue(mockUser as any);

      const result = await service.sendMessage(messageData);

      expect(mockSupabase.from).toHaveBeenCalledWith('direct_messages');
      expect(insertMock).toHaveBeenCalled();
      expect(result.id).toBe(createdMessage.id);
      expect(result.content).toBe(messageData.content);
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

      await expect(service.sendMessage(messageData)).rejects.toThrow(dbError);
    });
  });

  describe('markAsRead', () => {
    const messageId = '123e4567-e89b-12d3-a456-426614174003';

    it('should mark message as read successfully', async () => {
      const updateMock = vi.fn().mockResolvedValue({
        data: {},
        error: null
      });
      const eqMock = vi.fn(() => updateMock);
      mockSupabase.from.mockReturnValue({ 
        update: vi.fn(() => ({ eq: eqMock }))
      });

      await service.markAsRead(messageId);

      expect(mockSupabase.from).toHaveBeenCalledWith('direct_messages');
      expect(eqMock).toHaveBeenCalledWith('id', messageId);
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      
      const eqMock = vi.fn().mockResolvedValue({
        data: null,
        error: dbError
      });
      const updateMock = vi.fn(() => ({ eq: eqMock }));
      mockSupabase.from.mockReturnValue({ 
        update: updateMock
      });

      await expect(service.markAsRead(messageId)).rejects.toThrow(dbError);
    });
  });
});