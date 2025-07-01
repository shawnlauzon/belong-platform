import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSendMessage } from '../useSendMessage';
import { createWrapper } from '../../../../shared/__test__';
import { createMockMessage, createMockMessageData } from '../../__mocks__';

// Mock the auth provider
vi.mock('../../../../shared', () => ({
  useSupabase: vi.fn(),
}));

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

  it('should send message successfully', async () => {
    mockSendMessage.mockResolvedValue(mockMessage);

    const { result } = renderHook(() => useSendMessage(), {
      wrapper: createWrapper(),
    });

    const sentMessage = await result.current.mutateAsync(mockMessageData);

    expect(mockSendMessage).toHaveBeenCalledWith(mockMessageData);
    expect(result.current.isPending).toBe(false);
    expect(sentMessage).toEqual(mockMessage);
  });

  it('should handle send message errors', async () => {
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

  it('should start in idle state', () => {
    const { result } = renderHook(() => useSendMessage(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isPending).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();
  });

  it('should be in loading state during mutation', async () => {
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

  it('should reset state when reset is called', async () => {
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
