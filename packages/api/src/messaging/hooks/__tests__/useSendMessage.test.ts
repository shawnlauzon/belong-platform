import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSendMessage } from '../useSendMessage';
import { sendMessage } from '../../impl/sendMessage';
import { createWrapper } from '../../../test-utils';
import { createMockMessage, createMockMessageData } from '../../__tests__/test-utils';

// Mock the implementation
vi.mock('../../impl/sendMessage');
const mockSendMessage = vi.mocked(sendMessage);

describe('useSendMessage', () => {
  const mockMessage = createMockMessage();
  const mockMessageData = createMockMessageData();
  const toUserId = 'user-456';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should send message successfully', async () => {
    mockSendMessage.mockResolvedValue(mockMessage);

    const { result } = renderHook(
      () => useSendMessage(),
      { wrapper: createWrapper() }
    );

    const sentMessage = await result.current.mutateAsync({
      messageData: mockMessageData,
      toUserId,
    });

    expect(mockSendMessage).toHaveBeenCalledWith(mockMessageData, toUserId);
    expect(result.current.isPending).toBe(false);
    expect(sentMessage).toEqual(mockMessage);
  });

  it('should handle send message errors', async () => {
    const error = new Error('Failed to send message');
    mockSendMessage.mockRejectedValue(error);

    const { result } = renderHook(
      () => useSendMessage(),
      { wrapper: createWrapper() }
    );

    try {
      await result.current.mutateAsync({
        messageData: mockMessageData,
        toUserId,
      });
    } catch (e) {
      expect(e).toEqual(error);
    }

    await waitFor(() => {
      expect(result.current.error).toEqual(error);
    });
  });

  it('should start in idle state', () => {
    const { result } = renderHook(
      () => useSendMessage(),
      { wrapper: createWrapper() }
    );

    expect(result.current.isPending).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();
  });

  it('should be in loading state during mutation', async () => {
    mockSendMessage.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    const { result } = renderHook(
      () => useSendMessage(),
      { wrapper: createWrapper() }
    );

    result.current.mutate({
      messageData: mockMessageData,
      toUserId,
    });

    // Use waitFor to handle async state updates
    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });
  });

  it('should reset state when reset is called', async () => {
    mockSendMessage.mockResolvedValue(mockMessage);

    const { result } = renderHook(
      () => useSendMessage(),
      { wrapper: createWrapper() }
    );

    await result.current.mutateAsync({
      messageData: mockMessageData,
      toUserId,
    });

    expect(result.current.isPending).toBe(false);

    result.current.reset();

    expect(result.current.isPending).toBe(false);
    expect(result.current.data).toBeUndefined();
  });
});