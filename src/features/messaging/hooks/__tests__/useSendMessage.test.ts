import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useSendMessage } from '../useSendMessage';
import { sendMessage } from '../../api/sendMessage';
import { createFakeMessage, createFakeSendMessageInput } from '../../__fakes__';
import { createFakeUser } from '../../../users/__fakes__';
import { createTestWrapper } from '@/test-utils/testWrapper';
import { conversationKeys, communityChatKeys } from '../../queries';
import type { Database } from '@/shared/types/database';
import * as authHooks from '@/features/auth';
import * as sharedHooks from '@/shared/hooks';

// Mock the API function
vi.mock('../../api/sendMessage', () => ({
  sendMessage: vi.fn(),
}));

// Mock the auth and shared hooks
vi.mock('@/features/auth', () => ({
  useCurrentUser: vi.fn(),
}));

vi.mock('@/shared/hooks', () => ({
  useSupabase: vi.fn(),
}));

describe('useSendMessage', () => {
  const mockUser = createFakeUser();
  const mockSupabaseClient = {} as SupabaseClient<Database>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    vi.mocked(authHooks.useCurrentUser).mockReturnValue({
      data: mockUser,
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
      status: 'success',
    } as ReturnType<typeof authHooks.useCurrentUser>);

    vi.mocked(sharedHooks.useSupabase).mockReturnValue(mockSupabaseClient);
  });

  describe('cache invalidation', () => {
    it('should invalidate conversations list after sending message to conversation', async () => {
      // Arrange
      const conversationId = 'conv-123';
      const messageInput = createFakeSendMessageInput({
        conversationId,
        communityId: undefined,
      });
      const sentMessage = createFakeMessage({
        id: 'msg-1',
        conversationId,
        communityId: undefined,
        senderId: mockUser.id,
        content: messageInput.content,
      });

      vi.mocked(sendMessage).mockResolvedValue(sentMessage);

      const { wrapper, queryClient } = createTestWrapper();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      // Act
      const { result } = renderHook(() => useSendMessage(), { wrapper });
      await result.current.mutate(messageInput);

      // Assert
      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: conversationKeys.list(),
        });
      });
    });

    it('should invalidate community chat list after sending message to community', async () => {
      // Arrange
      const communityId = 'community-123';
      const messageInput = createFakeSendMessageInput({
        conversationId: undefined,
        communityId,
      });
      const sentMessage = createFakeMessage({
        id: 'msg-1',
        conversationId: undefined,
        communityId,
        senderId: mockUser.id,
        content: messageInput.content,
      });

      vi.mocked(sendMessage).mockResolvedValue(sentMessage);

      const { wrapper, queryClient } = createTestWrapper();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      // Act
      const { result } = renderHook(() => useSendMessage(), { wrapper });
      await result.current.mutate(messageInput);

      // Assert
      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: communityChatKeys.list(),
        });
      });
    });

    it('should update message list optimistically', async () => {
      // Arrange
      const conversationId = 'conv-123';
      const messageInput = createFakeSendMessageInput({
        conversationId,
      });
      const sentMessage = createFakeMessage({
        conversationId,
        senderId: mockUser.id,
      });

      vi.mocked(sendMessage).mockResolvedValue(sentMessage);

      const { wrapper, queryClient } = createTestWrapper();
      const setQueryDataSpy = vi.spyOn(queryClient, 'setQueryData');

      // Act
      const { result } = renderHook(() => useSendMessage(), { wrapper });
      await result.current.mutate(messageInput);

      // Assert
      await waitFor(() => {
        expect(setQueryDataSpy).toHaveBeenCalledWith(
          conversationKeys.messages(conversationId),
          expect.any(Function),
        );
      });
    });
  });

  describe('error handling', () => {
    it('should throw error if user is not authenticated', async () => {
      // Arrange
      vi.mocked(authHooks.useCurrentUser).mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        isError: false,
        isSuccess: true,
        status: 'success',
      } as ReturnType<typeof authHooks.useCurrentUser>);

      const messageInput = createFakeSendMessageInput();
      const { wrapper } = createTestWrapper();

      // Act & Assert
      const { result } = renderHook(() => useSendMessage(), { wrapper });
      await expect(result.current.mutate(messageInput)).rejects.toThrow(
        'User must be authenticated to send messages',
      );
    });

    it('should throw error if API call fails', async () => {
      // Arrange
      const apiError = new Error('API Error');
      vi.mocked(sendMessage).mockRejectedValue(apiError);

      const messageInput = createFakeSendMessageInput();
      const { wrapper } = createTestWrapper();

      // Act & Assert
      const { result } = renderHook(() => useSendMessage(), { wrapper });
      await expect(result.current.mutate(messageInput)).rejects.toThrow('API Error');
    });
  });

  describe('API integration', () => {
    it('should call sendMessage API with correct parameters', async () => {
      // Arrange
      const conversationId = 'conv-123';
      const messageInput = createFakeSendMessageInput({
        conversationId,
        content: 'Hello world',
      });
      const sentMessage = createFakeMessage({
        conversationId,
      });

      vi.mocked(sendMessage).mockResolvedValue(sentMessage);

      const { wrapper } = createTestWrapper();

      // Act
      const { result } = renderHook(() => useSendMessage(), { wrapper });
      await result.current.mutate(messageInput);

      // Assert
      expect(sendMessage).toHaveBeenCalledWith(
        mockSupabaseClient,
        mockUser.id,
        messageInput,
      );
    });

    it('should return the sent message', async () => {
      // Arrange
      const sentMessage = createFakeMessage({
        id: 'msg-123',
        content: 'Test message',
      });

      vi.mocked(sendMessage).mockResolvedValue(sentMessage);

      const messageInput = createFakeSendMessageInput();
      const { wrapper } = createTestWrapper();

      // Act
      const { result } = renderHook(() => useSendMessage(), { wrapper });
      const returnedMessage = await result.current.mutate(messageInput);

      // Assert
      expect(returnedMessage).toEqual(sentMessage);
    });
  });
});
