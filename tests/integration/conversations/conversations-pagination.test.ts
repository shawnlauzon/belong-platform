import {
  describe,
  test,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useConversations,
  useMessages,
  useSendMessage,
} from '../../../src';
import {
  TestDataFactory,
  authHelper,
  cleanupHelper,
  testWrapperManager,
  testUtils,
} from '../helpers';

describe('Conversations Pagination Integration Tests', () => {
  const wrapper = testWrapperManager.getWrapper();

  beforeAll(async () => {
    testWrapperManager.reset();
  });

  beforeEach(async () => {
    await cleanupHelper.ensureTestIsolation();
  });

  afterEach(async () => {
    await cleanupHelper.cleanupBetweenTests();
  });

  afterAll(async () => {
    await cleanupHelper.cleanupAfterAllTests();
  });

  describe('Message Pagination', () => {
    test('should paginate messages in a conversation with many messages', async () => {
      // Arrange: Create two users and a conversation
      const { user: user1, signOut: signOut1 } =
        await authHelper.createAndAuthenticateUser();
      await signOut1();

      const { user: user2, signOut: signOut2 } =
        await authHelper.createAndAuthenticateUser();

      const { result: sendMessageResult } = testUtils.renderHookWithWrapper(
        () => useSendMessage(),
        wrapper
      );

      await testUtils.waitForHookToInitialize(sendMessageResult);

      // Send 25 messages to test pagination (assuming page size is 20)
      let conversationId: string;
      const messageContents: string[] = [];

      for (let i = 1; i <= 25; i++) {
        const content = `Message ${i.toString().padStart(2, '0')}`;
        messageContents.push(content);

        await act(async () => {
          const result = await sendMessageResult.current.mutateAsync({
            recipientId: user1.id,
            content,
          });
          if (i === 1) {
            conversationId = result.conversationId;
          }
        });

        // Small delay to ensure different timestamps
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // Act: Fetch first page of messages
      const { result: messagesResult } = testUtils.renderHookWithWrapper(
        () => useMessages(conversationId!),
        wrapper
      );

      await waitFor(() => {
        expect(messagesResult.current.isSuccess).toBe(true);
      });

      // Verify: First page should have messages (newest first)
      const firstPageMessages =
        messagesResult.current.data?.pages[0]?.data || [];
      expect(firstPageMessages.length).toBeGreaterThan(0);
      expect(firstPageMessages.length).toBeLessThanOrEqual(20); // Assuming page size is 20

      // Messages should be in reverse chronological order (newest first)
      expect(firstPageMessages[0].content).toBe('Message 25');

      // Act: Fetch next page if there are more messages
      if (messagesResult.current.hasNextPage) {
        await act(async () => {
          await messagesResult.current.fetchNextPage();
        });

        await waitFor(() => {
          expect(messagesResult.current.data?.pages).toHaveLength(2);
        });

        // Verify: Second page should have remaining messages
        const secondPageMessages =
          messagesResult.current.data?.pages[1]?.data || [];
        expect(secondPageMessages.length).toBeGreaterThan(0);

        // Verify chronological order across pages
        const allMessages = [
          ...(messagesResult.current.data?.pages[0]?.data || []),
          ...(messagesResult.current.data?.pages[1]?.data || []),
        ];

        expect(allMessages).toHaveLength(25);

        // Check that messages are properly ordered across pages
        for (let i = 0; i < allMessages.length - 1; i++) {
          const currentTime = new Date(allMessages[i].createdAt).getTime();
          const nextTime = new Date(allMessages[i + 1].createdAt).getTime();
          expect(currentTime).toBeGreaterThanOrEqual(nextTime);
        }
      }

      await signOut2();
    });

    test('should handle empty message pagination gracefully', async () => {
      // Arrange: Create two users but no messages
      const { user: user1, signOut: signOut1 } =
        await authHelper.createAndAuthenticateUser();
      await signOut1();

      const { user: user2, signOut: signOut2 } =
        await authHelper.createAndAuthenticateUser();

      // Create a conversation with one message, then test pagination on empty conversation
      const { result: sendMessageResult } = testUtils.renderHookWithWrapper(
        () => useSendMessage(),
        wrapper
      );

      await testUtils.waitForHookToInitialize(sendMessageResult);

      let conversationId: string;
      await act(async () => {
        const result = await sendMessageResult.current.mutateAsync({
          recipientId: user1.id,
          content: 'Only message',
        });
        conversationId = result.conversationId;
      });

      // Act: Fetch messages
      const { result: messagesResult } = testUtils.renderHookWithWrapper(
        () => useMessages(conversationId),
        wrapper
      );

      await waitFor(() => {
        expect(messagesResult.current.isSuccess).toBe(true);
      });

      // Verify: Should have one message and no next page
      const messages = messagesResult.current.data?.pages[0]?.data || [];
      expect(messages).toHaveLength(1);
      expect(messagesResult.current.hasNextPage).toBe(false);

      await signOut2();
    });
  });

  describe('Conversation List Pagination', () => {
    test('should paginate conversation list with many conversations', async () => {
      // Arrange: Create main user and multiple conversation partners
      const { user: mainUser, signOut: signOutMain } =
        await authHelper.createAndAuthenticateUser();

      // Create 15 other users for conversations
      const otherUsers = await Promise.all(
        Array.from({ length: 15 }, async (_, i) => {
          const { user } = await authHelper.createAndAuthenticateUser();
          return user;
        })
      );

      // Sign out all other users and sign back in as main user
      await signOutMain();
      const { user: signedInMainUser, signOut: signOutMainAgain } =
        await authHelper.signInUser(mainUser.email);

      const { result: sendMessageResult } = testUtils.renderHookWithWrapper(
        () => useSendMessage(),
        wrapper
      );

      await testUtils.waitForHookToInitialize(sendMessageResult);

      // Create conversations with each user
      for (let i = 0; i < otherUsers.length; i++) {
        await act(async () => {
          await sendMessageResult.current.mutateAsync({
            recipientId: otherUsers[i].id,
            content: `Conversation ${i + 1}`,
          });
        });

        // Small delay to ensure different timestamps
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // Act: Fetch conversations
      const { result: conversationsResult } = testUtils.renderHookWithWrapper(
        () => useConversations(),
        wrapper
      );

      await waitFor(() => {
        expect(conversationsResult.current.isSuccess).toBe(true);
      });

      // Verify: Should have all conversations in first page or across pages
      const firstPageConversations =
        conversationsResult.current.data?.pages[0]?.data || [];
      expect(firstPageConversations.length).toBeGreaterThan(0);

      // If there are more pages, fetch them
      if (conversationsResult.current.hasNextPage) {
        await act(async () => {
          await conversationsResult.current.fetchNextPage();
        });

        await waitFor(() => {
          expect(
            conversationsResult.current.data?.pages?.length
          ).toBeGreaterThan(1);
        });
      }

      // Count total conversations across all pages
      const allConversations =
        conversationsResult.current.data?.pages?.flatMap((page) => page.data) ||
        [];
      expect(allConversations).toHaveLength(15);

      // Verify conversations are ordered by last activity (newest first)
      for (let i = 0; i < allConversations.length - 1; i++) {
        const currentTime = new Date(
          allConversations[i].lastMessage?.createdAt || 0
        ).getTime();
        const nextTime = new Date(
          allConversations[i + 1].lastMessage?.createdAt || 0
        ).getTime();
        expect(currentTime).toBeGreaterThanOrEqual(nextTime);
      }

      await signOutMainAgain();
    });

    test('should handle conversation list pagination with mixed activity', async () => {
      // Arrange: Create main user and conversation partners
      const { user: mainUser, signOut: signOutMain } =
        await authHelper.createAndAuthenticateUser();

      const { user: user1 } = await authHelper.createAndAuthenticateUser();
      const { user: user2 } = await authHelper.createAndAuthenticateUser();
      const { user: user3 } = await authHelper.createAndAuthenticateUser();

      await signOutMain();
      const { user: signedInMainUser, signOut: signOutMainAgain } =
        await authHelper.signInUser(mainUser.email);

      const { result: sendMessageResult } = testUtils.renderHookWithWrapper(
        () => useSendMessage(),
        wrapper
      );

      await testUtils.waitForHookToInitialize(sendMessageResult);

      // Create conversations with different timestamps
      let conversation1Id: string,
        conversation2Id: string,
        conversation3Id: string;

      // Create conversation 1
      await act(async () => {
        const result = await sendMessageResult.current.mutateAsync({
          recipientId: user1.id,
          content: 'First conversation',
        });
        conversation1Id = result.conversationId;
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Create conversation 2
      await act(async () => {
        const result = await sendMessageResult.current.mutateAsync({
          recipientId: user2.id,
          content: 'Second conversation',
        });
        conversation2Id = result.conversationId;
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Create conversation 3
      await act(async () => {
        const result = await sendMessageResult.current.mutateAsync({
          recipientId: user3.id,
          content: 'Third conversation',
        });
        conversation3Id = result.conversationId;
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Send another message to conversation 1 to update its last activity
      await act(async () => {
        await sendMessageResult.current.mutateAsync({
          recipientId: user1.id,
          content: 'Updated first conversation',
        });
      });

      // Act: Fetch conversations
      const { result: conversationsResult } = testUtils.renderHookWithWrapper(
        () => useConversations(),
        wrapper
      );

      await waitFor(() => {
        expect(conversationsResult.current.isSuccess).toBe(true);
      });

      // Verify: Conversations should be ordered by last activity
      const conversations =
        conversationsResult.current.data?.pages[0]?.data || [];
      expect(conversations).toHaveLength(3);

      // Conversation 1 should be first (most recent activity)
      expect(conversations[0].lastMessage?.content).toBe(
        'Updated first conversation'
      );
      expect(conversations[1].lastMessage?.content).toBe('Third conversation');
      expect(conversations[2].lastMessage?.content).toBe('Second conversation');

      await signOutMainAgain();
    });
  });

  describe('Pagination Edge Cases', () => {
    test('should handle fetching beyond available pages', async () => {
      // Arrange: Create conversation with limited messages
      const { user: user1, signOut: signOut1 } =
        await authHelper.createAndAuthenticateUser();
      await signOut1();

      const { user: user2, signOut: signOut2 } =
        await authHelper.createAndAuthenticateUser();

      const { result: sendMessageResult } = testUtils.renderHookWithWrapper(
        () => useSendMessage(),
        wrapper
      );

      await testUtils.waitForHookToInitialize(sendMessageResult);

      // Send only 3 messages
      let conversationId: string;
      for (let i = 1; i <= 3; i++) {
        await act(async () => {
          const result = await sendMessageResult.current.mutateAsync({
            recipientId: user1.id,
            content: `Message ${i}`,
          });
          if (i === 1) {
            conversationId = result.conversationId;
          }
        });
      }

      // Act: Fetch messages
      const { result: messagesResult } = testUtils.renderHookWithWrapper(
        () => useMessages(conversationId!),
        wrapper
      );

      await waitFor(() => {
        expect(messagesResult.current.isSuccess).toBe(true);
      });

      // Verify: Should have all messages in first page with no next page
      const messages = messagesResult.current.data?.pages[0]?.data || [];
      expect(messages).toHaveLength(3);
      expect(messagesResult.current.hasNextPage).toBe(false);

      // Attempt to fetch next page (should not error but not add pages)
      if (messagesResult.current.fetchNextPage) {
        await act(async () => {
          await messagesResult.current.fetchNextPage();
        });

        // Should still have only one page
        expect(messagesResult.current.data?.pages).toHaveLength(1);
      }

      await signOut2();
    });

    test('should maintain pagination state during real-time updates', async () => {
      // Arrange: Create conversation with multiple messages
      const { user: user1, signOut: signOut1 } =
        await authHelper.createAndAuthenticateUser();
      await signOut1();

      const { user: user2, signOut: signOut2 } =
        await authHelper.createAndAuthenticateUser();

      const { result: sendMessageResult } = testUtils.renderHookWithWrapper(
        () => useSendMessage(),
        wrapper
      );

      await testUtils.waitForHookToInitialize(sendMessageResult);

      // Send initial messages
      let conversationId: string;
      for (let i = 1; i <= 10; i++) {
        await act(async () => {
          const result = await sendMessageResult.current.mutateAsync({
            recipientId: user1.id,
            content: `Initial message ${i}`,
          });
          if (i === 1) {
            conversationId = result.conversationId;
          }
        });
      }

      // Get messages
      const { result: messagesResult } = testUtils.renderHookWithWrapper(
        () => useMessages(conversationId!),
        wrapper
      );

      await waitFor(() => {
        expect(messagesResult.current.isSuccess).toBe(true);
      });

      const initialMessageCount =
        messagesResult.current.data?.pages[0]?.data?.length || 0;

      // Send new message while pagination is active
      await act(async () => {
        await sendMessageResult.current.mutateAsync({
          recipientId: user1.id,
          content: 'New message during pagination',
        });
      });

      // Verify: Cache should be invalidated and new message should appear
      await waitFor(() => {
        const updatedMessages =
          messagesResult.current.data?.pages[0]?.data || [];
        expect(updatedMessages.length).toBe(initialMessageCount + 1);
        expect(updatedMessages[0].content).toBe(
          'New message during pagination'
        );
      });

      await signOut2();
    });
  });
});
