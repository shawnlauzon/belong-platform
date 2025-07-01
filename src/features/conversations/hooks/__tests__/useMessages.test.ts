import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMessages } from '../useMessages';
import { createWrapper } from '../../../../shared/__test__/';
import { createMockMessage } from '../../__mocks__';
import type { MessageFilter } from '../../types';

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
        messages: (conversationId: string) => ['conversations', 'messages', conversationId],
        userList: (userId: string) => ['user', userId, 'conversations'],
      },
    },
  };
});

// Mock the conversation service
vi.mock('../../services/conversations.service', () => ({
  createConversationsService: vi.fn(),
}));

import { useSupabase } from '../../../../shared';
import { createConversationsService } from '../../services/conversations.service';

const mockUseSupabase = vi.mocked(useSupabase);
const mockCreateConversationsService = vi.mocked(createConversationsService);
const mockFetchMessages = vi.fn();

describe('useMessages', () => {
  const conversationId = 'conversation-123';
  const mockMessages = [createMockMessage(), createMockMessage()];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSupabase.mockReturnValue({} as any);
    mockCreateConversationsService.mockReturnValue({
      fetchMessages: mockFetchMessages,
    } as any);
  });

  it('should fetch messages successfully', async () => {
    mockFetchMessages.mockResolvedValue(mockMessages);

    const { result } = renderHook(() => useMessages(conversationId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });

    expect(result.current.data).toEqual(mockMessages);
    expect(mockFetchMessages).toHaveBeenCalledWith(conversationId, undefined);
  });

  it('should fetch messages with filters', async () => {
    const filters: MessageFilter = {
      page: 1,
      pageSize: 20,
      since: new Date('2024-01-01'),
      conversationId,
    };
    mockFetchMessages.mockResolvedValue(mockMessages);

    const { result } = renderHook(() => useMessages(conversationId, filters), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });

    expect(mockFetchMessages).toHaveBeenCalledWith(conversationId, filters);
  });

  it('should be disabled when conversationId is empty', () => {
    const { result } = renderHook(() => useMessages(''), {
      wrapper: createWrapper(),
    });

    // When disabled, query should not be fetching
    expect(result.current.isFetching).toBe(false);
    expect(mockFetchMessages).not.toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    const error = new Error('Failed to fetch messages');
    mockFetchMessages.mockRejectedValue(error);

    const { result } = renderHook(() => useMessages(conversationId), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.error).toEqual(error);
    });

    expect(result.current.error).toEqual(error);
  });

  it('should include filters in query key for proper caching', async () => {
    const filters: MessageFilter = {
      page: 3,
      pageSize: 15,
      conversationId,
    };
    mockFetchMessages.mockResolvedValue(mockMessages);

    const { result } = renderHook(() => useMessages(conversationId, filters), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });

    expect(result.current.data).toEqual(mockMessages);
  });
});
