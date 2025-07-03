import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSendMessage } from '../useSendMessage';
import { createWrapper } from '../../../../shared/__tests__';
import { createMockMessage, createMockMessageData } from '../../__mocks__';

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
        messages: (conversationId: string) => [
          'conversations',
          'messages',
          conversationId,
        ],
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
const mockSendMessage = vi.fn();

describe.skip('useSendMessage', () => {
  const mockMessage = createMockMessage();
  const mockMessageData = createMockMessageData();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSupabase.mockReturnValue({} as any);
    mockCreateConversationsService.mockReturnValue({
      sendMessage: mockSendMessage,
    } as any);
  });

  it.skip('should send message successfully', async () => {
    mockSendMessage.mockResolvedValue(mockMessage);

    const { result } = renderHook(() => useSendMessage(), {
      wrapper: createWrapper(),
    });

    const sentMessage = await result.current.mutateAsync(mockMessageData);

    expect(mockSendMessage).toHaveBeenCalledWith(mockMessageData);
    expect(result.current.isPending).toBe(false);
    expect(sentMessage).toEqual(mockMessage);
  });

  it.skip('should handle send message errors', async () => {
    const error = new Error('Failed to send message');
    mockSendMessage.mockRejectedValue(error);

    const { result } = renderHook(() => useSendMessage(), {
      wrapper: createWrapper(),
    });

    try {
      await result.current.mutateAsync(mockMessageData);
    } catch (e) {
      expect(e).toEqual(error);
    }

    await waitFor(() => {
      expect(result.current.error).toEqual(error);
    });
  });

  it.skip('should start in idle state', () => {
    const { result } = renderHook(() => useSendMessage(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isPending).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();
  });

  it.skip('should be in loading state during mutation', async () => {
    mockSendMessage.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    const { result } = renderHook(() => useSendMessage(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(mockMessageData);

    // Use waitFor to handle async state updates
    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });
  });

  it.skip('should reset state when reset is called', async () => {
    mockSendMessage.mockResolvedValue(mockMessage);

    const { result } = renderHook(() => useSendMessage(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync(mockMessageData);

    expect(result.current.isPending).toBe(false);

    result.current.reset();

    expect(result.current.isPending).toBe(false);
    expect(result.current.data).toBeUndefined();
  });
});
