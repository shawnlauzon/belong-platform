import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMarkAsRead } from '../useMarkAsRead';
import { markAsRead } from '../../impl/markAsRead';
import { createWrapper } from '../../../test-utils';

// Mock the implementation
vi.mock('../../impl/markAsRead');
const mockMarkAsRead = vi.mocked(markAsRead);

describe('useMarkAsRead', () => {
  const messageId = 'message-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should mark message as read successfully', async () => {
    mockMarkAsRead.mockResolvedValue(undefined);

    const { result } = renderHook(
      () => useMarkAsRead(),
      { wrapper: createWrapper() }
    );

    await result.current.mutateAsync(messageId);

    expect(mockMarkAsRead).toHaveBeenCalledWith(messageId);
    // After successful mutation, the mutation should not be pending
    expect(result.current.isPending).toBe(false);
  });

  it('should handle mark as read errors', async () => {
    const error = new Error('Failed to mark message as read');
    mockMarkAsRead.mockRejectedValue(error);

    const { result } = renderHook(
      () => useMarkAsRead(),
      { wrapper: createWrapper() }
    );

    try {
      await result.current.mutateAsync(messageId);
    } catch (e) {
      expect(e).toEqual(error);
    }

    // Error should be captured after the mutation fails
    await waitFor(() => {
      expect(result.current.error).toEqual(error);
    });
  });

  it('should start in idle state', () => {
    const { result } = renderHook(
      () => useMarkAsRead(),
      { wrapper: createWrapper() }
    );

    expect(result.current.isPending).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();
  });

  it('should be in loading state during mutation', async () => {
    mockMarkAsRead.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    const { result } = renderHook(
      () => useMarkAsRead(),
      { wrapper: createWrapper() }
    );

    result.current.mutate(messageId);

    // Use waitFor to handle async state updates
    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });
  });

  it('should reset state when reset is called', async () => {
    mockMarkAsRead.mockResolvedValue(undefined);

    const { result } = renderHook(
      () => useMarkAsRead(),
      { wrapper: createWrapper() }
    );

    await result.current.mutateAsync(messageId);

    expect(result.current.isPending).toBe(false);

    result.current.reset();

    expect(result.current.isPending).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('should handle multiple mark as read operations', async () => {
    mockMarkAsRead.mockResolvedValue(undefined);

    const { result } = renderHook(
      () => useMarkAsRead(),
      { wrapper: createWrapper() }
    );

    const messageIds = ['message-1', 'message-2', 'message-3'];

    for (const id of messageIds) {
      await result.current.mutateAsync(id);
      expect(mockMarkAsRead).toHaveBeenCalledWith(id);
    }

    expect(mockMarkAsRead).toHaveBeenCalledTimes(3);
  });
});