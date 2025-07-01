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
  useMarkAsRead,
} from '../../../src';
import {
  TestDataFactory,
  authHelper,
  cleanupHelper,
  testWrapperManager,
  testUtils,
  commonExpectations,
} from '../helpers';

describe.skip('Conversations Integration Tests', () => {
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

  describe('Conversation Creation and Fetching', () => {
    test('should create conversation between two users and fetch it', async () => {
      // Arrange: Create and authenticate two users
      const { user: user1, signOut: signOut1 } =
        await authHelper.createAndAuthenticateUser();
      await signOut1();

      const { user: user2, signOut: signOut2 } =
        await authHelper.createAndAuthenticateUser();

      // Act: Send initial message to create conversation
      const { result: sendMessageResult } = testUtils.renderHookWithWrapper(
        () => useSendMessage(),
        wrapper
      );

      await testUtils.waitForHookToInitialize(sendMessageResult);

      await act(async () => {
        await sendMessageResult.current.mutateAsync({
          recipientId: user1.userId,
          content: 'Hello from integration test!',
        });
      });

      // Verify: Check that conversation was created and appears in both users' lists
      const { result: conversationsResult } = testUtils.renderHookWithWrapper(
        () => useConversations(),
        wrapper
      );

      await waitFor(() => {
        expect(conversationsResult.current.isSuccess).toBe(true);
      });

      const conversations =
        conversationsResult.current.data?.pages[0]?.data || [];
      expect(conversations).toHaveLength(1);
      expect(conversations[0].participants).toContain(user1.userId);
      expect(conversations[0].participants).toContain(user2.userId);
      expect(conversations[0].lastMessage?.content).toBe(
        'Hello from integration test!'
      );

      await signOut2();
    });

    test('should fetch messages for a conversation', async () => {
      // Arrange: Create conversation with messages
      const { user: user1, signOut: signOut1 } =
        await authHelper.createAndAuthenticateUser();
      await signOut1();

      const { user: user2, signOut: signOut2 } =
        await authHelper.createAndAuthenticateUser();

      // Send initial message
      const { result: sendMessageResult } = testUtils.renderHookWithWrapper(
        () => useSendMessage(),
        wrapper
      );

      await testUtils.waitForHookToInitialize(sendMessageResult);

      let conversationId: string;
      await act(async () => {
        const result = await sendMessageResult.current.mutateAsync({
          recipientId: user1.id,
          content: 'First message',
        });
        conversationId = result.conversationId;
      });

      // Act: Fetch messages for the conversation
      const { result: messagesResult } = testUtils.renderHookWithWrapper(
        () => useMessages(conversationId!),
        wrapper
      );

      // Verify: Messages are fetched correctly
      await waitFor(() => {
        expect(messagesResult.current.isSuccess).toBe(true);
      });

      const messages = messagesResult.current.data?.pages[0]?.data || [];
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('First message');
      expect(messages[0].senderId).toBe(user2.id);

      await signOut2();
    });
  });

  describe('Multi-Message Conversations', () => {
    test('should handle back-and-forth conversation between users', async () => {
      // Arrange: Create two users
      const { user: user1, signOut: signOut1 } =
        await authHelper.createAndAuthenticateUser();
      const { user: user2, signOut: signOut2 } =
        await authHelper.createAndAuthenticateUser();

      let conversationId: string;

      // User 2 sends first message
      const { result: sendMessage2 } = testUtils.renderHookWithWrapper(
        () => useSendMessage(),
        wrapper
      );

      await testUtils.waitForHookToInitialize(sendMessage2);

      await act(async () => {
        const result = await sendMessage2.current.mutateAsync({
          recipientId: user1.id,
          content: 'Hello User 1!',
        });
        conversationId = result.conversationId;
      });

      await signOut2();

      // User 1 responds
      const { user: signedInUser1, signOut: signOut1Again } =
        await authHelper.signInUser(user1.email);

      const { result: sendMessage1 } = testUtils.renderHookWithWrapper(
        () => useSendMessage(),
        wrapper
      );

      await testUtils.waitForHookToInitialize(sendMessage1);

      await act(async () => {
        await sendMessage1.current.mutateAsync({
          recipientId: user2.id,
          content: 'Hello User 2! Nice to meet you.',
        });
      });

      // Verify: Both messages exist in conversation
      const { result: messagesResult } = testUtils.renderHookWithWrapper(
        () => useMessages(conversationId),
        wrapper
      );

      await waitFor(() => {
        expect(messagesResult.current.isSuccess).toBe(true);
      });

      const messages = messagesResult.current.data?.pages[0]?.data || [];
      expect(messages).toHaveLength(2);

      // Messages should be ordered by creation time (newest first)
      expect(messages[0].content).toBe('Hello User 2! Nice to meet you.');
      expect(messages[0].senderId).toBe(user1.id);
      expect(messages[1].content).toBe('Hello User 1!');
      expect(messages[1].senderId).toBe(user2.id);

      await signOut1Again();
    });

    test('should handle multiple messages from same user', async () => {
      // Arrange: Create two users
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

      let conversationId: string;

      // Send multiple messages quickly
      await act(async () => {
        const result1 = await sendMessageResult.current.mutateAsync({
          recipientId: user1.id,
          content: 'Message 1',
        });
        conversationId = result1.conversationId;

        await sendMessageResult.current.mutateAsync({
          recipientId: user1.id,
          content: 'Message 2',
        });

        await sendMessageResult.current.mutateAsync({
          recipientId: user1.id,
          content: 'Message 3',
        });
      });

      // Verify: All messages are stored and ordered correctly
      const { result: messagesResult } = testUtils.renderHookWithWrapper(
        () => useMessages(conversationId),
        wrapper
      );

      await waitFor(() => {
        expect(messagesResult.current.isSuccess).toBe(true);
      });

      const messages = messagesResult.current.data?.pages[0]?.data || [];
      expect(messages).toHaveLength(3);
      expect(messages[0].content).toBe('Message 3'); // Newest first
      expect(messages[1].content).toBe('Message 2');
      expect(messages[2].content).toBe('Message 1');

      await signOut2();
    });
  });

  describe('Message Read Status', () => {
    test('should mark messages as read and update status', async () => {
      // Arrange: Create conversation with unread message
      const { user: user1, signOut: signOut1 } =
        await authHelper.createAndAuthenticateUser();
      await signOut1();

      const { user: user2, signOut: signOut2 } =
        await authHelper.createAndAuthenticateUser();

      // User 2 sends message to User 1
      const { result: sendMessageResult } = testUtils.renderHookWithWrapper(
        () => useSendMessage(),
        wrapper
      );

      await testUtils.waitForHookToInitialize(sendMessageResult);

      let conversationId: string;
      await act(async () => {
        const result = await sendMessageResult.current.mutateAsync({
          recipientId: user1.id,
          content: 'Unread message',
        });
        conversationId = result.conversationId;
      });

      await signOut2();

      // User 1 signs in and checks unread status
      const { user: signedInUser1, signOut: signOut1Again } =
        await authHelper.signInUser(user1.email);

      const { result: messagesResult } = testUtils.renderHookWithWrapper(
        () => useMessages(conversationId),
        wrapper
      );

      await waitFor(() => {
        expect(messagesResult.current.isSuccess).toBe(true);
      });

      const messages = messagesResult.current.data?.pages[0]?.data || [];
      expect(messages[0].readAt).toBeNull(); // Should be unread

      // Act: Mark message as read
      const { result: markAsReadResult } = testUtils.renderHookWithWrapper(
        () => useMarkAsRead(),
        wrapper
      );

      await testUtils.waitForHookToInitialize(markAsReadResult);

      await act(async () => {
        await markAsReadResult.current.mutateAsync({
          conversationId,
          messageId: messages[0].id,
        });
      });

      // Verify: Message is marked as read
      await waitFor(() => {
        const updatedMessages =
          messagesResult.current.data?.pages[0]?.data || [];
        expect(updatedMessages[0].readAt).not.toBeNull();
      });

      await signOut1Again();
    });
  });

  describe('Authentication and Authorization', () => {
    test('should prevent access to conversations when not authenticated', async () => {
      // Ensure no user is signed in
      await authHelper.ensureSignedOut();

      // Act: Try to fetch conversations without authentication
      const { result: conversationsResult } = testUtils.renderHookWithWrapper(
        () => useConversations(),
        wrapper
      );

      // Verify: Should fail due to RLS policies
      await waitFor(() => {
        expect(conversationsResult.current.isError).toBe(true);
      });
    });

    test('should only show conversations user is part of', async () => {
      // Arrange: Create three users
      const { user: user1, signOut: signOut1 } =
        await authHelper.createAndAuthenticateUser();
      await signOut1();

      const { user: user2, signOut: signOut2 } =
        await authHelper.createAndAuthenticateUser();
      await signOut2();

      const { user: user3, signOut: signOut3 } =
        await authHelper.createAndAuthenticateUser();

      // User 3 sends message to User 1 (User 2 not involved)
      const { result: sendMessageResult } = testUtils.renderHookWithWrapper(
        () => useSendMessage(),
        wrapper
      );

      await testUtils.waitForHookToInitialize(sendMessageResult);

      await act(async () => {
        await sendMessageResult.current.mutateAsync({
          recipientId: user1.id,
          content: 'Message between User 1 and User 3',
        });
      });

      await signOut3();

      // User 2 checks conversations - should see none
      const { user: signedInUser2, signOut: signOut2Again } =
        await authHelper.signInUser(user2.email);

      const { result: user2ConversationsResult } =
        testUtils.renderHookWithWrapper(() => useConversations(), wrapper);

      await waitFor(() => {
        expect(user2ConversationsResult.current.isSuccess).toBe(true);
      });

      const user2Conversations =
        user2ConversationsResult.current.data?.pages[0]?.data || [];
      expect(user2Conversations).toHaveLength(0);

      await signOut2Again();

      // User 1 checks conversations - should see one
      const { user: signedInUser1, signOut: signOut1Again } =
        await authHelper.signInUser(user1.email);

      const { result: user1ConversationsResult } =
        testUtils.renderHookWithWrapper(() => useConversations(), wrapper);

      await waitFor(() => {
        expect(user1ConversationsResult.current.isSuccess).toBe(true);
      });

      const user1Conversations =
        user1ConversationsResult.current.data?.pages[0]?.data || [];
      expect(user1Conversations).toHaveLength(1);
      expect(user1Conversations[0].participants).toContain(user1.id);
      expect(user1Conversations[0].participants).toContain(user3.id);

      await signOut1Again();
    });
  });

  describe('Error Handling', () => {
    test('should handle sending message to non-existent user', async () => {
      // Arrange: Create authenticated user
      const { user, signOut } = await authHelper.createAndAuthenticateUser();

      const { result: sendMessageResult } = testUtils.renderHookWithWrapper(
        () => useSendMessage(),
        wrapper
      );

      await testUtils.waitForHookToInitialize(sendMessageResult);

      // Act & Verify: Try to send message to non-existent user
      await act(async () => {
        await expect(
          sendMessageResult.current.mutateAsync({
            recipientId: 'non-existent-user-id',
            content: 'This should fail',
          })
        ).rejects.toThrow();
      });

      await signOut();
    });

    test('should handle fetching messages for non-existent conversation', async () => {
      // Arrange: Create authenticated user
      const { user, signOut } = await authHelper.createAndAuthenticateUser();

      // Act: Try to fetch messages for non-existent conversation
      const { result: messagesResult } = testUtils.renderHookWithWrapper(
        () => useMessages('non-existent-conversation-id'),
        wrapper
      );

      // Verify: Should handle gracefully (likely empty result or error)
      await waitFor(() => {
        expect(
          messagesResult.current.isError || messagesResult.current.isSuccess
        ).toBe(true);
      });

      if (messagesResult.current.isSuccess) {
        const messages = messagesResult.current.data?.pages[0]?.data || [];
        expect(messages).toHaveLength(0);
      }

      await signOut();
    });
  });

  describe('Data Consistency', () => {
    test('should maintain conversation participant order consistency', async () => {
      // Arrange: Create two users
      const { user: user1, signOut: signOut1 } =
        await authHelper.createAndAuthenticateUser();
      await signOut1();

      const { user: user2, signOut: signOut2 } =
        await authHelper.createAndAuthenticateUser();

      // Act: Create conversation from User 2 to User 1
      const { result: sendMessageResult } = testUtils.renderHookWithWrapper(
        () => useSendMessage(),
        wrapper
      );

      await testUtils.waitForHookToInitialize(sendMessageResult);

      await act(async () => {
        await sendMessageResult.current.mutateAsync({
          recipientId: user1.id,
          content: 'Test message',
        });
      });

      // Verify: Participants should be in consistent order (alphabetical by ID)
      const { result: conversationsResult } = testUtils.renderHookWithWrapper(
        () => useConversations(),
        wrapper
      );

      await waitFor(() => {
        expect(conversationsResult.current.isSuccess).toBe(true);
      });

      const conversations =
        conversationsResult.current.data?.pages[0]?.data || [];
      expect(conversations).toHaveLength(1);

      const participantIds = conversations[0].participants;
      const sortedIds = [...participantIds].sort();
      expect(participantIds).toEqual(sortedIds);

      await signOut2();
    });

    test('should update last message timestamp when new message is sent', async () => {
      // Arrange: Create conversation
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

      // Send first message
      await act(async () => {
        await sendMessageResult.current.mutateAsync({
          recipientId: user1.id,
          content: 'First message',
        });
      });

      // Get initial conversation state
      const { result: conversationsResult1 } = testUtils.renderHookWithWrapper(
        () => useConversations(),
        wrapper
      );

      await waitFor(() => {
        expect(conversationsResult1.current.isSuccess).toBe(true);
      });

      const initialConversation =
        conversationsResult1.current.data?.pages[0]?.data?.[0];
      const initialTimestamp = initialConversation?.lastMessage?.createdAt;

      // Wait a moment to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Send second message
      await act(async () => {
        await sendMessageResult.current.mutateAsync({
          recipientId: user1.id,
          content: 'Second message',
        });
      });

      // Verify: Last message timestamp should be updated
      await waitFor(() => {
        const updatedConversations =
          conversationsResult1.current.data?.pages[0]?.data || [];
        const updatedConversation = updatedConversations[0];
        expect(updatedConversation?.lastMessage?.content).toBe(
          'Second message'
        );
        expect(
          new Date(updatedConversation?.lastMessage?.createdAt || 0).getTime()
        ).toBeGreaterThan(new Date(initialTimestamp || 0).getTime());
      });

      await signOut2();
    });
  });
});
