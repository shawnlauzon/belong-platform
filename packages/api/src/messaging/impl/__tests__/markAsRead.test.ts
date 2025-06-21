import { describe, it, expect, vi, beforeEach } from 'vitest';
import { markAsRead } from '../markAsRead';
import { getBelongClient } from '@belongnetwork/core';

// Mock dependencies
vi.mock('@belongnetwork/core');

const mockGetBelongClient = vi.mocked(getBelongClient);

describe('markAsRead', () => {
  // Create a more specific mock chain
  const mockQueryResult = {
    data: {},
    error: null,
  };
  
  // Create spies for each method in the chain
  const mockUpdateSpy = vi.fn();
  const mockEq1Spy = vi.fn();
  const mockEq2Spy = vi.fn();
  
  const mockSupabase = {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      update: mockUpdateSpy.mockReturnValue({
        eq: mockEq1Spy.mockReturnValue({
          eq: mockEq2Spy.mockReturnValue(Promise.resolve(mockQueryResult))
        })
      })
    })),
  };

  const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  };

  const messageId = 'message-123';
  const userId = 'user-456';

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock query result to success by default
    mockQueryResult.data = {};
    mockQueryResult.error = null;
    mockGetBelongClient.mockReturnValue({
      supabase: mockSupabase as any,
      logger: mockLogger as any,
    });
  });

  it('should mark message as read successfully', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });

    // mockQueryResult is already set to success in beforeEach

    await markAsRead(messageId);

    expect(mockSupabase.auth.getUser).toHaveBeenCalled();
    expect(mockSupabase.from).toHaveBeenCalledWith('direct_messages');
    expect(mockUpdateSpy).toHaveBeenCalledWith({
      read_at: expect.any(String),
    });
    expect(mockEq1Spy).toHaveBeenCalledWith('id', messageId);
    expect(mockEq2Spy).toHaveBeenCalledWith('to_user_id', userId);
    expect(mockLogger.info).toHaveBeenCalledWith(
      '💬 API: Successfully marked message as read',
      { messageId }
    );
  });

  it('should throw error when user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    await expect(markAsRead(messageId)).rejects.toThrow();
    expect(mockLogger.error).toHaveBeenCalledWith(
      '💬 API: User must be authenticated to mark message as read',
      { error: null }
    );
  });

  it('should throw error when auth fails', async () => {
    const authError = new Error('Auth failed');
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: authError,
    });

    await expect(markAsRead(messageId)).rejects.toThrow();
    expect(mockLogger.error).toHaveBeenCalledWith(
      '💬 API: User must be authenticated to mark message as read',
      { error: authError }
    );
  });

  it('should throw error when database update fails', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });

    const dbError = new Error('Database error');
    // Set up the query result to return error
    mockQueryResult.data = null;
    mockQueryResult.error = dbError;

    await expect(markAsRead(messageId)).rejects.toThrow(dbError);
    expect(mockLogger.error).toHaveBeenCalledWith(
      '💬 API: Failed to mark message as read',
      { error: dbError, messageId }
    );
  });

  it('should include security check for recipient only', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });

    // mockQueryResult is already set to success in beforeEach

    await markAsRead(messageId);

    // Verify that the security check is in place - only recipient can mark as read
    expect(mockEq2Spy).toHaveBeenCalledWith('to_user_id', userId);
  });

  it('should log debug message at start', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });

    // mockQueryResult is already set to success in beforeEach

    await markAsRead(messageId);

    expect(mockLogger.debug).toHaveBeenCalledWith(
      '💬 API: Marking message as read',
      { messageId }
    );
  });

  it('should handle errors and log appropriately', async () => {
    const error = new Error('Something went wrong');
    mockSupabase.auth.getUser.mockRejectedValue(error);

    await expect(markAsRead(messageId)).rejects.toThrow(error);
    expect(mockLogger.error).toHaveBeenCalledWith(
      '💬 API: Error marking message as read',
      { error, messageId }
    );
  });
});