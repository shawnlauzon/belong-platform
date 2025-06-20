import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MessageInfo } from '@belongnetwork/types';
import { getBelongClient } from '@belongnetwork/core';
import { fetchMessages } from '../../impl/fetchMessages';
import { createMockDbDirectMessage } from '../../../test-utils/mocks';

// Mock the getBelongClient
vi.mock('@belongnetwork/core', () => ({
  getBelongClient: vi.fn(),
}));

const mockGetBelongClient = vi.mocked(getBelongClient);

describe('fetchMessages', () => {
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
          eq: vi.fn(() => ({
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

  it('should fetch messages for a conversation and return MessageInfo[]', async () => {
    // Arrange
    const conversationId = 'conv-123';
    const messages = [
      createMockDbDirectMessage({
        conversation_id: conversationId,
        content: 'First message',
        created_at: '2023-01-01T10:00:00Z',
      }),
      createMockDbDirectMessage({
        conversation_id: conversationId,
        content: 'Second message',
        created_at: '2023-01-01T11:00:00Z',
      }),
    ];

    const messageChain = {
      select: vi.fn(() => messageChain),
      eq: vi.fn(() => messageChain),
      order: vi.fn(() => Promise.resolve({ data: messages, error: null })),
    };
    mockSupabase.from.mockReturnValueOnce(messageChain);

    // Act
    const result = await fetchMessages(conversationId);

    // Assert
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject<Partial<MessageInfo>>({
      id: messages[0].id,
      conversationId: messages[0].conversation_id,
      content: messages[0].content,
      fromUserId: messages[0].from_user_id,
      toUserId: messages[0].to_user_id,
    });

    // Verify correct query was made
    expect(mockSupabase.from).toHaveBeenCalledWith('direct_messages');
    expect(messageChain.eq).toHaveBeenCalledWith('conversation_id', conversationId);
    expect(messageChain.order).toHaveBeenCalledWith('created_at', { ascending: true });
  });

  it('should handle empty message list', async () => {
    // Arrange
    const conversationId = 'conv-123';

    const messageChain = {
      select: vi.fn(() => messageChain),
      eq: vi.fn(() => messageChain),
      order: vi.fn(() => Promise.resolve({ data: [], error: null })),
    };
    mockSupabase.from.mockReturnValueOnce(messageChain);

    // Act
    const result = await fetchMessages(conversationId);

    // Assert
    expect(result).toEqual([]);
  });

  it('should handle database error gracefully', async () => {
    // Arrange
    const conversationId = 'conv-123';
    const error = new Error('Database connection failed');

    const messageChain = {
      select: vi.fn(() => messageChain),
      eq: vi.fn(() => messageChain),
      order: vi.fn(() => Promise.resolve({ data: null, error })),
    };
    mockSupabase.from.mockReturnValueOnce(messageChain);

    // Act & Assert
    await expect(fetchMessages(conversationId)).rejects.toThrow('Database connection failed');
    expect(mockLogger.error).toHaveBeenCalledWith(
      '💬 API: Failed to fetch messages',
      { error, conversationId }
    );
  });

  it('should apply pagination filters when provided', async () => {
    // Arrange
    const conversationId = 'conv-123';
    const filters = {
      page: 1,
      pageSize: 10,
    };

    const messageChain = {
      select: vi.fn(() => messageChain),
      eq: vi.fn(() => messageChain),
      order: vi.fn(() => messageChain),
      range: vi.fn(() => Promise.resolve({ data: [], error: null })),
    };
    mockSupabase.from.mockReturnValueOnce(messageChain);

    // Act
    await fetchMessages(conversationId, filters);

    // Assert
    expect(messageChain.range).toHaveBeenCalledWith(10, 19); // page 1, size 10 = range 10-19
  });

  it('should apply since filter when provided', async () => {
    // Arrange
    const conversationId = 'conv-123';
    const sinceDate = new Date('2023-01-01T00:00:00Z');
    const filters = {
      since: sinceDate,
    };

    const messageChain = {
      select: vi.fn(() => messageChain),
      eq: vi.fn(() => messageChain),
      order: vi.fn(() => messageChain),
      gte: vi.fn(() => Promise.resolve({ data: [], error: null })),
    };
    mockSupabase.from.mockReturnValueOnce(messageChain);

    // Act
    await fetchMessages(conversationId, filters);

    // Assert
    expect(messageChain.gte).toHaveBeenCalledWith('created_at', sinceDate.toISOString());
  });
});