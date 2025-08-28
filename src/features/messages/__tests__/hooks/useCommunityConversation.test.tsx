import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCommunityConversation } from '../../hooks/useCommunityConversation';
import type { CommunityConversation } from '../../types/conversation';
import * as messagesApi from '../../api';

// Mock the API
vi.mock('../../api', () => ({
  fetchCommunityConversation: vi.fn(),
}));

// Mock the shared hooks
vi.mock('@/shared', () => ({
  logger: { error: vi.fn() },
  useSupabase: vi.fn(() => mockSupabase),
}));

vi.mock('@/config', () => ({
  STANDARD_CACHE_TIME: 300000,
}));

const mockSupabase = { mock: 'supabase' };
const mockCommunityId = 'community-123';

describe('useCommunityConversation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('should fetch community conversation successfully', async () => {
    const mockConversation: CommunityConversation = {
      id: 'conversation-456',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      lastMessageAt: new Date('2024-01-01T12:00:00Z'),
      lastMessagePreview: 'Welcome to the community!',
      lastMessageSenderId: 'user-123',
      communityId: mockCommunityId,
      conversationType: 'community',
      unreadCount: 5,
      lastReadAt: new Date('2024-01-01T11:00:00Z'),
      participantCount: 10
    };

    vi.mocked(messagesApi.fetchCommunityConversation).mockResolvedValue(mockConversation);

    const { result } = renderHook(
      () => useCommunityConversation(mockCommunityId),
      { wrapper }
    );

    expect(result.current.isPending).toBe(true);
    expect(result.current.data).toBeUndefined();

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });

    expect(result.current.data).toEqual(mockConversation);
    expect(result.current.error).toBeNull();
    expect(messagesApi.fetchCommunityConversation).toHaveBeenCalledWith(
      mockSupabase, 
      mockCommunityId
    );
  });

  it('should handle null conversation (no chat exists)', async () => {
    vi.mocked(messagesApi.fetchCommunityConversation).mockResolvedValue(null);

    const { result } = renderHook(
      () => useCommunityConversation(mockCommunityId),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should handle API errors', async () => {
    const mockError = new Error('Failed to fetch conversation');
    vi.mocked(messagesApi.fetchCommunityConversation).mockRejectedValue(mockError);

    const { result } = renderHook(
      () => useCommunityConversation(mockCommunityId),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toEqual(mockError);
  });

  it('should use correct query key', async () => {
    vi.mocked(messagesApi.fetchCommunityConversation).mockResolvedValue(null);

    renderHook(
      () => useCommunityConversation(mockCommunityId),
      { wrapper }
    );

    await waitFor(() => {
      // Query should be in the cache with the correct key
      const queryData = queryClient.getQueryData(['conversations', 'community', mockCommunityId]);
      expect(queryData).toBeNull();
    });
  });

  it('should accept custom query options', async () => {
    const mockConversation: CommunityConversation = {
      id: 'conversation-456',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      lastMessageAt: null,
      lastMessagePreview: null,
      lastMessageSenderId: null,
      communityId: mockCommunityId,
      conversationType: 'community',
      unreadCount: 0,
      lastReadAt: null,
      participantCount: 1
    };

    vi.mocked(messagesApi.fetchCommunityConversation).mockResolvedValue(mockConversation);

    const { result } = renderHook(
      () => useCommunityConversation(mockCommunityId, { 
        refetchInterval: 10000,
        enabled: false 
      }),
      { wrapper }
    );

    // Should not fetch immediately due to enabled: false
    // Note: isPending can be true initially even when disabled
    expect(result.current.data).toBeUndefined();
    expect(messagesApi.fetchCommunityConversation).not.toHaveBeenCalled();
  });
});