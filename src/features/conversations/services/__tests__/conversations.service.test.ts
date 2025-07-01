import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createConversationsService } from '../conversations.service';
import { createUserService } from '../../../users/services/user.service';

// Mock dependencies
vi.mock('../../../users/services/user.service');
const mockCreateUserService = vi.mocked(createUserService);

describe('createConversationsService', () => {
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
    auth: {
      getUser: vi.fn(),
    },
  };

  const mockUserService = {
    fetchUserById: vi.fn(),
  };

  const service = createConversationsService(mockSupabase as any);
  const userId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateUserService.mockReturnValue(mockUserService as any);
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
        updated_at: '2024-01-01T00:00:00Z',
      },
    ];

    it('should fetch conversations successfully', async () => {
      mockSupabase.range.mockResolvedValue({
        data: mockDbConversations,
        error: null,
      });

      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174002',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      };
      mockUserService.fetchUserById.mockResolvedValue(mockUser as any);

      const result = await service.fetchConversations(userId);

      expect(mockSupabase.from).toHaveBeenCalledWith('conversations');
      expect(mockSupabase.or).toHaveBeenCalledWith(
        `participant_1_id.eq.${userId},participant_2_id.eq.${userId}`
      );
      expect(mockSupabase.order).toHaveBeenCalledWith('last_message_at', {
        ascending: false,
      });
      expect(result).toHaveLength(1);
    });

    it('should handle empty results', async () => {
      mockSupabase.range.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await service.fetchConversations(userId);
      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockSupabase.range.mockResolvedValue({
        data: null,
        error: dbError,
      });

      await expect(service.fetchConversations(userId)).rejects.toThrow(dbError);
      // Note: Logger is imported directly, so we can't easily test logging calls
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
        updated_at: '2024-01-01T00:00:00Z',
      },
    ];

    it('should fetch messages successfully', async () => {
      mockSupabase.range.mockResolvedValue({
        data: mockDbMessages,
        error: null,
      });

      const mockUser = {
        id: userId,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      };
      mockUserService.fetchUserById.mockResolvedValue(mockUser as any);

      const result = await service.fetchMessages(conversationId);

      expect(mockSupabase.from).toHaveBeenCalledWith('direct_messages');
      expect(mockSupabase.eq).toHaveBeenCalledWith(
        'conversation_id',
        conversationId
      );
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', {
        ascending: false,
      });
      expect(result).toHaveLength(1);
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockSupabase.range.mockResolvedValue({
        data: null,
        error: dbError,
      });

      await expect(service.fetchMessages(conversationId)).rejects.toThrow(
        dbError
      );
    });
  });

  describe('sendMessage', () => {
    const messageData = {
      conversationId: '123e4567-e89b-12d3-a456-426614174001',
      senderId: userId,
      content: 'Hello there!',
    };

    it('should send message successfully', async () => {
      // Mock auth.getUser
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      });

      // Mock conversation lookup
      const mockConversation = {
        participant_1_id: userId,
        participant_2_id: 'other-user-id',
      };
      const conversationSingleMock = vi.fn().mockResolvedValue({
        data: mockConversation,
        error: null,
      });
      const conversationSelectMock = vi.fn(() => ({
        eq: vi.fn(() => ({ single: conversationSingleMock })),
      }));

      const createdMessage = {
        id: '123e4567-e89b-12d3-a456-426614174003',
        conversation_id: messageData.conversationId,
        from_user_id: userId,
        to_user_id: 'other-user-id',
        content: messageData.content,
        read_at: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const singleMock = vi.fn().mockResolvedValue({
        data: createdMessage,
        error: null,
      });
      const selectMock = vi.fn(() => ({ single: singleMock }));
      const insertMock = vi.fn(() => ({ select: selectMock }));

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'conversations') {
          return { select: conversationSelectMock };
        } else if (table === 'direct_messages') {
          return { insert: insertMock };
        }
        return mockSupabase;
      });

      const mockUser = {
        id: userId,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      };
      mockUserService.fetchUserById.mockResolvedValue(mockUser as any);

      const result = await service.sendMessage(messageData);

      expect(mockSupabase.from).toHaveBeenCalledWith('direct_messages');
      expect(insertMock).toHaveBeenCalled();
      expect(result.id).toBe(createdMessage.id);
      expect(result.content).toBe(messageData.content);
    });

    it('should handle database errors', async () => {
      // Mock auth.getUser
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      });

      // Mock conversation lookup
      const mockConversation = {
        participant_1_id: userId,
        participant_2_id: 'other-user-id',
      };
      const conversationSingleMock = vi.fn().mockResolvedValue({
        data: mockConversation,
        error: null,
      });
      const conversationSelectMock = vi.fn(() => ({
        eq: vi.fn(() => ({ single: conversationSingleMock })),
      }));

      const dbError = new Error('Database error');

      const singleMock = vi.fn().mockResolvedValue({
        data: null,
        error: dbError,
      });
      const selectMock = vi.fn(() => ({ single: singleMock }));
      const insertMock = vi.fn(() => ({ select: selectMock }));

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'conversations') {
          return { select: conversationSelectMock };
        } else if (table === 'direct_messages') {
          return { insert: insertMock };
        }
        return mockSupabase;
      });

      await expect(service.sendMessage(messageData)).rejects.toThrow(dbError);
    });
  });

  describe('markAsRead', () => {
    const messageId = '123e4567-e89b-12d3-a456-426614174003';

    it('should mark message as read successfully', async () => {
      const updateMock = vi.fn().mockResolvedValue({
        data: {},
        error: null,
      });
      const eqMock = vi.fn(() => updateMock);
      mockSupabase.from.mockReturnValue({
        update: vi.fn(() => ({ eq: eqMock })),
      });

      await service.markAsRead(messageId);

      expect(mockSupabase.from).toHaveBeenCalledWith('direct_messages');
      expect(eqMock).toHaveBeenCalledWith('id', messageId);
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');

      const eqMock = vi.fn().mockResolvedValue({
        data: null,
        error: dbError,
      });
      const updateMock = vi.fn(() => ({ eq: eqMock }));
      mockSupabase.from.mockReturnValue({
        update: updateMock,
      });

      await expect(service.markAsRead(messageId)).rejects.toThrow(dbError);
    });
  });
});
