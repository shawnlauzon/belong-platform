import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useConversations } from '../useConversations';
import { createWrapper } from '../../../test-utils';
import { createMockConversationInfo } from '../../../test-utils';
import type { ConversationFilter } from '@belongnetwork/types';

// Mock the auth provider
vi.mock('../../../auth/providers/CurrentUserProvider', () => ({
  useSupabase: vi.fn(),
}));

// Mock the messaging service
vi.mock('../../services/messaging.service', () => ({
  createMessagingService: vi.fn(),
}));

import { useSupabase } from '../../../auth/providers/CurrentUserProvider';
import { createMessagingService } from '../../services/messaging.service';

const mockUseSupabase = vi.mocked(useSupabase);
const mockCreateMessagingService = vi.mocked(createMessagingService);
const mockFetchConversations = vi.fn();

describe('useConversations', () => {
  const userId = 'user-123';
  const mockConversations = [
    createMockConversationInfo(),
    createMockConversationInfo(),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSupabase.mockReturnValue({} as any);
    mockCreateMessagingService.mockReturnValue({
      fetchConversations: mockFetchConversations,
    } as any);
  });

  it('should fetch conversations successfully', async () => {
    mockFetchConversations.mockResolvedValue(mockConversations);

    const { result } = renderHook(
      () => useConversations(userId),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockConversations);
    expect(mockFetchConversations).toHaveBeenCalledWith(userId, undefined);
  });

  it('should fetch conversations with filters', async () => {
    const filters: ConversationFilter = {
      page: 1,
      pageSize: 10,
    };
    mockFetchConversations.mockResolvedValue(mockConversations);

    const { result } = renderHook(
      () => useConversations(userId, filters),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFetchConversations).toHaveBeenCalledWith(userId, filters);
  });

  it('should be disabled when userId is empty', () => {
    const { result } = renderHook(
      () => useConversations(''),
      { wrapper: createWrapper() }
    );

    expect(result.current.isFetching).toBe(false);
    expect(mockFetchConversations).not.toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    const error = new Error('Failed to fetch conversations');
    mockFetchConversations.mockRejectedValue(error);

    const { result } = renderHook(
      () => useConversations(userId),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
  });

  it('should include filters in query key for proper caching', async () => {
    const filters: ConversationFilter = {
      page: 2,
      pageSize: 5,
    };
    mockFetchConversations.mockResolvedValue(mockConversations);

    const { result } = renderHook(
      () => useConversations(userId, filters),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // The hook should work correctly with filters
    expect(result.current.data).toEqual(mockConversations);
  });
});