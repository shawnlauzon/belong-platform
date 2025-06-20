import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ConversationInfo } from '@belongnetwork/types';
import { getBelongClient } from '@belongnetwork/core';
import { fetchConversations } from '../../impl/fetchConversations';
import {
  createMockDbConversation,
  createMockDbDirectMessage,
  createMockDbProfile,
} from '../../../test-utils/mocks';
import { createMockUserPair } from '../test-utils';

// Mock the getBelongClient
vi.mock('@belongnetwork/core', () => ({
  getBelongClient: vi.fn(),
}));

const mockGetBelongClient = vi.mocked(getBelongClient);

describe('fetchConversations', () => {
  let mockSupabase: any;
  let mockLogger: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockLogger = {
      debug: vi.fn(),
      error: vi.fn(),
    };

    mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          or: vi.fn(() => ({
            order: vi.fn(() => ({
              data: [],
              error: null,
            })),
          })),
        })),
      })),
    };

    mockGetBelongClient.mockReturnValue({
      supabase: mockSupabase,
      logger: mockLogger,
    });
  });

  it('should fetch conversations for a user and return ConversationInfo[]', async () => {
    // Arrange
    const userId = 'user-123';
    const { user1, user2 } = createMockUserPair();
    const lastMessage = createMockDbDirectMessage({
      content: 'Last message content',
    });
    const conversation = createMockDbConversation({
      participant_1_id: user1.id,
      participant_2_id: user2.id,
      last_message_id: lastMessage.id, // Set the last message ID
    });

    // Mock conversation query
    const conversationChain = {
      select: vi.fn(() => conversationChain),
      or: vi.fn(() => conversationChain),
      order: vi.fn(() => Promise.resolve({ data: [conversation], error: null })),
    };

    // Mock last messages query
    const messageChain = {
      select: vi.fn(() => messageChain),
      in: vi.fn(() => messageChain),
      order: vi.fn(() => Promise.resolve({ data: [lastMessage], error: null })),
    };

    // Mock profiles query
    const profileChain = {
      select: vi.fn(() => profileChain),
      in: vi.fn(() => Promise.resolve({ data: [
        createMockDbProfile({ id: user1.id }),
        createMockDbProfile({ id: user2.id }),
      ], error: null })),
    };

    // Mock unread count query for all conversations
    const unreadChain = {
      select: vi.fn(() => unreadChain),
      in: vi.fn(() => unreadChain),
      is: vi.fn(() => unreadChain),
      neq: vi.fn(() => Promise.resolve({ data: [], error: null })),
    };

    // Set up the mock to return different chains for each call
    mockSupabase.from
      .mockReturnValueOnce(conversationChain)  // conversations query
      .mockReturnValueOnce(messageChain)       // last messages query
      .mockReturnValueOnce(profileChain)       // profiles query
      .mockReturnValueOnce(unreadChain);       // unread count query

    // Act
    const result = await fetchConversations(userId);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject<Partial<ConversationInfo>>({
      id: conversation.id,
      participant1Id: conversation.participant_1_id,
      participant2Id: conversation.participant_2_id,
      lastMessagePreview: lastMessage.content,
      unreadCount: 0, // No unread messages in this test
    });

    // Verify correct queries were made
    expect(mockSupabase.from).toHaveBeenCalledWith('conversations');
    expect(conversationChain.or).toHaveBeenCalledWith(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`);
    expect(conversationChain.order).toHaveBeenCalledWith('last_activity_at', { ascending: false });
  });

  it('should handle empty conversation list', async () => {
    // Arrange
    const userId = 'user-123';

    const conversationChain = {
      select: vi.fn(() => conversationChain),
      or: vi.fn(() => conversationChain),
      order: vi.fn(() => Promise.resolve({ data: [], error: null })),
    };
    mockSupabase.from.mockReturnValueOnce(conversationChain);

    // Act
    const result = await fetchConversations(userId);

    // Assert
    expect(result).toEqual([]);
  });

  it('should handle database error gracefully', async () => {
    // Arrange
    const userId = 'user-123';
    const error = new Error('Database connection failed');

    const conversationChain = {
      select: vi.fn(() => conversationChain),
      or: vi.fn(() => conversationChain),
      order: vi.fn(() => Promise.resolve({ data: null, error })),
    };
    mockSupabase.from.mockReturnValueOnce(conversationChain);

    // Act & Assert
    await expect(fetchConversations(userId)).rejects.toThrow('Database connection failed');
    expect(mockLogger.error).toHaveBeenCalledWith(
      '💬 API: Failed to fetch conversations',
      { error }
    );
  });

  it('should calculate unread count correctly', async () => {
    // Arrange
    const userId = 'user-123';
    const { user1, user2 } = createMockUserPair();
    const conversation = createMockDbConversation({
      participant_1_id: user1.id,
      participant_2_id: user2.id,
    });

    // 3 unread messages (read_at is null)
    const unreadMessages = [
      createMockDbDirectMessage({ conversation_id: conversation.id, read_at: null }),
      createMockDbDirectMessage({ conversation_id: conversation.id, read_at: null }),
      createMockDbDirectMessage({ conversation_id: conversation.id, read_at: null }),
    ];

    // Mock conversation query
    const conversationChain = {
      select: vi.fn(() => conversationChain),
      or: vi.fn(() => conversationChain),
      order: vi.fn(() => Promise.resolve({ data: [conversation], error: null })),
    };

    // Mock last messages query (returns empty for simplicity)
    const messageChain = {
      select: vi.fn(() => messageChain),
      in: vi.fn(() => messageChain),
      order: vi.fn(() => Promise.resolve({ data: [], error: null })),
    };

    // Mock profiles query
    const profileChain = {
      select: vi.fn(() => profileChain),
      in: vi.fn(() => Promise.resolve({ data: [
        createMockDbProfile({ id: user1.id }),
        createMockDbProfile({ id: user2.id }),
      ], error: null })),
    };

    // Mock unread count query - return messages with conversation_id for counting
    const unreadMessagesWithConvId = unreadMessages.map(msg => ({
      conversation_id: conversation.id,
    }));
    
    const unreadChain = {
      select: vi.fn(() => unreadChain),
      in: vi.fn(() => unreadChain),
      is: vi.fn(() => unreadChain),
      neq: vi.fn(() => Promise.resolve({ data: unreadMessagesWithConvId, error: null })),
    };

    // Set up the mock to return different chains for each call
    mockSupabase.from
      .mockReturnValueOnce(conversationChain)  // conversations query
      .mockReturnValueOnce(messageChain)       // last messages query
      .mockReturnValueOnce(profileChain)       // profiles query
      .mockReturnValueOnce(unreadChain);       // unread count query

    // Act
    const result = await fetchConversations(userId);

    // Assert
    expect(result[0].unreadCount).toBe(3);
  });
});