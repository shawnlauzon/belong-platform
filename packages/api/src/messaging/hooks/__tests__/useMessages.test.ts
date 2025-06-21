import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMessages } from '../useMessages';
import { fetchMessages } from '../../impl/fetchMessages';
import { createWrapper } from '../../../test-utils';
import { createMockMessage } from '../../__tests__/test-utils';
import type { MessageFilter } from '@belongnetwork/types';

// Mock the implementation
vi.mock('../../impl/fetchMessages');
const mockFetchMessages = vi.mocked(fetchMessages);

describe('useMessages', () => {
  const conversationId = 'conversation-123';
  const mockMessages = [
    createMockMessage(),
    createMockMessage(),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch messages successfully', async () => {
    mockFetchMessages.mockResolvedValue(mockMessages);

    const { result } = renderHook(
      () => useMessages(conversationId),
      { wrapper: createWrapper() }
    );

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
    };
    mockFetchMessages.mockResolvedValue(mockMessages);

    const { result } = renderHook(
      () => useMessages(conversationId, filters),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });

    expect(mockFetchMessages).toHaveBeenCalledWith(conversationId, filters);
  });

  it('should be disabled when conversationId is empty', () => {
    const { result } = renderHook(
      () => useMessages(''),
      { wrapper: createWrapper() }
    );

    // When disabled, query should not be fetching
    expect(result.current.isFetching).toBe(false);
    expect(mockFetchMessages).not.toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    const error = new Error('Failed to fetch messages');
    mockFetchMessages.mockRejectedValue(error);

    const { result } = renderHook(
      () => useMessages(conversationId),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.error).toEqual(error);
    });

    expect(result.current.error).toEqual(error);
  });

  it('should include filters in query key for proper caching', async () => {
    const filters: MessageFilter = {
      page: 3,
      pageSize: 15,
    };
    mockFetchMessages.mockResolvedValue(mockMessages);

    const { result } = renderHook(
      () => useMessages(conversationId, filters),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });

    expect(result.current.data).toEqual(mockMessages);
  });
});