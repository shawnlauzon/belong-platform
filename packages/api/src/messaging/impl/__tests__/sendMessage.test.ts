import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendMessage } from '../sendMessage';
import { getBelongClient } from '@belongnetwork/core';
import { fetchUserById } from '../../../users/impl/fetchUserById';
import { createMockMessageData, createMockUser } from '../../__tests__/test-utils';
import { forDbMessageInsert } from '../messageTransformer';

// Mock dependencies
vi.mock('@belongnetwork/core');
vi.mock('../../../users/impl/fetchUserById');
vi.mock('../messageTransformer');

const mockGetBelongClient = vi.mocked(getBelongClient);
const mockFetchUserById = vi.mocked(fetchUserById);
const mockForDbMessageInsert = vi.mocked(forDbMessageInsert);

describe('sendMessage', () => {
  const mockSupabase = {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
  };

  const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  };

  const messageData = createMockMessageData();
  const toUserId = 'user-456';
  const fromUserId = 'user-123';
  const fromUser = createMockUser({ id: fromUserId });
  const toUser = createMockUser({ id: toUserId });

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBelongClient.mockReturnValue({
      supabase: mockSupabase as any,
      logger: mockLogger as any,
    });
  });

  it('should send message successfully', async () => {
    // Setup mocks
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: fromUserId } },
      error: null,
    });

    const dbMessage = {
      conversation_id: messageData.conversationId,
      content: messageData.content,
      from_user_id: fromUserId,
      to_user_id: toUserId,
    };

    const createdMessage = {
      id: 'message-123',
      conversation_id: messageData.conversationId,
      content: messageData.content,
      from_user_id: fromUserId,
      to_user_id: toUserId,
      read_at: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    mockForDbMessageInsert.mockReturnValue(dbMessage);
    mockSupabase.single.mockResolvedValue({
      data: createdMessage,
      error: null,
    });
    mockSupabase.eq.mockResolvedValue({
      data: {},
      error: null,
    });
    mockFetchUserById.mockImplementation((id) => 
      Promise.resolve(id === fromUserId ? fromUser : toUser)
    );

    const result = await sendMessage(messageData, toUserId);

    expect(result).toEqual({
      id: createdMessage.id,
      conversationId: createdMessage.conversation_id,
      fromUserId: createdMessage.from_user_id,
      toUserId: createdMessage.to_user_id,
      content: createdMessage.content,
      readAt: undefined,
      createdAt: new Date(createdMessage.created_at),
      updatedAt: new Date(createdMessage.updated_at),
      fromUser,
      toUser,
    });

    expect(mockSupabase.auth.getUser).toHaveBeenCalled();
    expect(mockForDbMessageInsert).toHaveBeenCalledWith(messageData, fromUserId, toUserId);
    expect(mockSupabase.from).toHaveBeenCalledWith('direct_messages');
    expect(mockSupabase.insert).toHaveBeenCalledWith([dbMessage]);
    expect(mockFetchUserById).toHaveBeenCalledWith(fromUserId);
    expect(mockFetchUserById).toHaveBeenCalledWith(toUserId);
  });

  it('should throw error when user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    await expect(sendMessage(messageData, toUserId)).rejects.toThrow();
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('should throw error when auth fails', async () => {
    const authError = new Error('Auth failed');
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: authError,
    });

    await expect(sendMessage(messageData, toUserId)).rejects.toThrow();
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('should throw error when database insert fails', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: fromUserId } },
      error: null,
    });

    const dbError = new Error('Database error');
    mockSupabase.single.mockResolvedValue({
      data: null,
      error: dbError,
    });

    mockForDbMessageInsert.mockReturnValue({
      conversation_id: messageData.conversationId,
      content: messageData.content,
      from_user_id: fromUserId,
      to_user_id: toUserId,
    });

    await expect(sendMessage(messageData, toUserId)).rejects.toThrow(dbError);
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('should throw error when user fetch fails', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: fromUserId } },
      error: null,
    });

    const createdMessage = {
      id: 'message-123',
      conversation_id: messageData.conversationId,
      content: messageData.content,
      from_user_id: fromUserId,
      to_user_id: toUserId,
      read_at: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    mockForDbMessageInsert.mockReturnValue({
      conversation_id: messageData.conversationId,
      content: messageData.content,
      from_user_id: fromUserId,
      to_user_id: toUserId,
    });
    mockSupabase.single.mockResolvedValue({
      data: createdMessage,
      error: null,
    });
    mockSupabase.eq.mockResolvedValue({
      data: {},
      error: null,
    });
    mockFetchUserById.mockResolvedValue(null); // Simulate user not found

    await expect(sendMessage(messageData, toUserId)).rejects.toThrow(
      'Failed to fetch user data for message'
    );
  });

  it('should update conversation after sending message', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: fromUserId } },
      error: null,
    });

    const createdMessage = {
      id: 'message-123',
      conversation_id: messageData.conversationId,
      content: messageData.content,
      from_user_id: fromUserId,
      to_user_id: toUserId,
      read_at: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    mockForDbMessageInsert.mockReturnValue({
      conversation_id: messageData.conversationId,
      content: messageData.content,
      from_user_id: fromUserId,
      to_user_id: toUserId,
    });
    mockSupabase.single.mockResolvedValue({
      data: createdMessage,
      error: null,
    });
    mockSupabase.eq.mockResolvedValue({
      data: {},
      error: null,
    });
    mockFetchUserById.mockImplementation((id) => 
      Promise.resolve(id === fromUserId ? fromUser : toUser)
    );

    await sendMessage(messageData, toUserId);

    expect(mockSupabase.from).toHaveBeenCalledWith('conversations');
    expect(mockSupabase.update).toHaveBeenCalledWith({
      last_activity_at: expect.any(String),
      last_message_id: createdMessage.id,
    });
    expect(mockSupabase.eq).toHaveBeenCalledWith('id', messageData.conversationId);
  });
});