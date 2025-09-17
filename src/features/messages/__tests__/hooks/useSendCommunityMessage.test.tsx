import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSendCommunityMessage } from '../../hooks/useSendCommunityMessage';
import type { CommunityConversation, Message } from '../../types';
import * as messagesApi from '../../api';

// Mock the APIs
vi.mock('../../api', () => ({
  fetchConversation: vi.fn(),
  sendMessage: vi.fn(),
}));

// Mock the shared hooks
vi.mock('@/shared', () => ({
  logger: { 
    info: vi.fn(),
    error: vi.fn() 
  },
  useSupabase: vi.fn(() => mockSupabase),
}));

const mockSupabase = { mock: 'supabase' };
const mockCommunityId = 'community-123';
const mockConversationId = 'conversation-456';

describe('useSendCommunityMessage', () => {
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

  it('should send community message successfully', async () => {
    const mockConversation: CommunityConversation = {
      id: mockConversationId,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      lastMessageAt: null,
      lastMessagePreview: null,
      lastMessageSenderId: null,
      communityId: mockCommunityId,
      conversationType: 'community',
      unreadCount: 0,
      lastReadAt: null,
      participantCount: 10
    };

    const mockMessage: Message = {
      id: 'message-789',
      conversationId: mockConversationId,
      senderId: 'user-456',
      content: 'Hello community!',
      isEdited: false,
      isDeleted: false,
      encryptionVersion: 1,
      createdAt: new Date('2024-01-01T12:00:00Z'),
      updatedAt: new Date('2024-01-01T12:00:00Z'),
      sender: {
        id: 'user-456',
        displayName: 'Test User',
        email: 'test@example.com',
        location: null,
        bio: null,
        avatarUrl: null,
        trustScore: 100,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      },
      status: undefined,
      isMine: true
    };

    // Mock fetchConversation for queryClient.fetchQuery
    vi.mocked(messagesApi.fetchConversation).mockResolvedValue(mockConversation);
    vi.mocked(messagesApi.sendMessage).mockResolvedValue(mockMessage);

    const { result } = renderHook(() => useSendCommunityMessage(), { wrapper });

    await act(async () => {
      result.current.mutate({
        communityId: mockCommunityId,
        content: 'Hello community!',
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockMessage);
    expect(messagesApi.fetchConversation).toHaveBeenCalledWith(
      mockSupabase,
      mockCommunityId
    );
    expect(messagesApi.sendMessage).toHaveBeenCalledWith(mockSupabase, {
      conversationId: mockConversationId,
      content: 'Hello community!',
    });
  });

  it('should handle custom message type', async () => {
    const mockConversation: CommunityConversation = {
      id: mockConversationId,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      lastMessageAt: null,
      lastMessagePreview: null,
      lastMessageSenderId: null,
      communityId: mockCommunityId,
      conversationType: 'community',
      unreadCount: 0,
      lastReadAt: null,
      participantCount: 5
    };

    const mockSystemMessage: Message = {
      id: 'message-system',
      conversationId: mockConversationId,
      senderId: 'user-456',
      content: 'System announcement',
      isEdited: false,
      isDeleted: false,
      encryptionVersion: 1,
      createdAt: new Date('2024-01-01T12:00:00Z'),
      updatedAt: new Date('2024-01-01T12:00:00Z'),
      sender: {
        id: 'user-456',
        displayName: 'Admin',
        email: 'admin@example.com',
        location: null,
        bio: null,
        avatarUrl: null,
        trustScore: 100,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      },
      status: undefined,
      isMine: true
    };

    vi.mocked(messagesApi.fetchConversation).mockResolvedValue(mockConversation);
    vi.mocked(messagesApi.sendMessage).mockResolvedValue(mockSystemMessage);

    const { result } = renderHook(() => useSendCommunityMessage(), { wrapper });

    await act(async () => {
      result.current.mutate({
        communityId: mockCommunityId,
        content: 'System announcement',
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(messagesApi.sendMessage).toHaveBeenCalledWith(mockSupabase, {
      conversationId: mockConversationId,
      content: 'System announcement',
    });
  });

  it('should handle error when community conversation not found', async () => {
    vi.mocked(messagesApi.fetchConversation).mockResolvedValue(null);

    const { result } = renderHook(() => useSendCommunityMessage(), { wrapper });

    await act(async () => {
      result.current.mutate({
        communityId: mockCommunityId,
        content: 'Hello community!',
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(
      new Error('Community conversation not found. Please contact an administrator.')
    );
  });

  it('should handle send message API error', async () => {
    const mockConversation: CommunityConversation = {
      id: mockConversationId,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      lastMessageAt: null,
      lastMessagePreview: null,
      lastMessageSenderId: null,
      communityId: mockCommunityId,
      conversationType: 'community',
      unreadCount: 0,
      lastReadAt: null,
      participantCount: 3
    };

    const mockError = new Error('Failed to send message');
    
    vi.mocked(messagesApi.fetchConversation).mockResolvedValue(mockConversation);
    vi.mocked(messagesApi.sendMessage).mockRejectedValue(mockError);

    const { result } = renderHook(() => useSendCommunityMessage(), { wrapper });

    await act(async () => {
      result.current.mutate({
        communityId: mockCommunityId,
        content: 'Hello community!',
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(mockError);
  });

  it('should invalidate queries on success', async () => {
    const mockConversation: CommunityConversation = {
      id: mockConversationId,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      lastMessageAt: null,
      lastMessagePreview: null,
      lastMessageSenderId: null,
      communityId: mockCommunityId,
      conversationType: 'community',
      unreadCount: 0,
      lastReadAt: null,
      participantCount: 8
    };

    const mockMessage: Message = {
      id: 'message-success',
      conversationId: mockConversationId,
      senderId: 'user-456',
      content: 'Test message',
      isEdited: false,
      isDeleted: false,
      encryptionVersion: 1,
      createdAt: new Date('2024-01-01T12:00:00Z'),
      updatedAt: new Date('2024-01-01T12:00:00Z'),
      sender: {
        id: 'user-456',
        displayName: 'Test User',
        email: 'test@example.com',
        location: null,
        bio: null,
        avatarUrl: null,
        trustScore: 100,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      },
      status: undefined,
      isMine: true
    };

    vi.mocked(messagesApi.fetchConversation).mockResolvedValue(mockConversation);
    vi.mocked(messagesApi.sendMessage).mockResolvedValue(mockMessage);

    // Spy on queryClient invalidation
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useSendCommunityMessage(), { wrapper });

    await act(async () => {
      result.current.mutate({
        communityId: mockCommunityId,
        content: 'Test message',
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['messages'],
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ['conversations', 'community', mockCommunityId],
    });
  });
});