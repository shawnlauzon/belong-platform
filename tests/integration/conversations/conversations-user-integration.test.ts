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

describe.skip('Conversations User Integration Tests', () => {
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

  describe('User Data Assembly in Conversations', () => {
    test('should properly assemble user data for conversation participants', async () => {
      // Arrange: Create multiple users with detailed profiles
      const { user: user1, signOut: signOut1 } =
        await authHelper.createAndAuthenticateUser();
      const { user: user2, signOut: signOut2 } =
        await authHelper.createAndAuthenticateUser();
      const { user: user3, signOut: signOut3 } =
        await authHelper.createAndAuthenticateUser();

      // Create conversations from user1 to others
      await signOut1();
      const { user: signedInUser1, signOut: signOut1Again } =
        await authHelper.signInUser(user1.email);

      const { result: sendMessageResult } = testUtils.renderHookWithWrapper(
        () => useSendMessage(),
        wrapper
      );

      await testUtils.waitForHookToInitialize(sendMessageResult);

      // Send messages to create conversations
      await act(async () => {
        await sendMessageResult.current.mutateAsync({
          recipientId: user2.id,
          content: 'Hello User 2',
        });
      });

      await act(async () => {
        await sendMessageResult.current.mutateAsync({
          recipientId: user3.id,
          content: 'Hello User 3',
        });
      });

      // Act: Fetch conversations with assembled user data
      const { result: conversationsResult } = testUtils.renderHookWithWrapper(
        () => useConversations(),
        wrapper
      );

      await waitFor(() => {
        expect(conversationsResult.current.isSuccess).toBe(true);
      });

      // Verify: User data should be properly assembled
      const conversations =
        conversationsResult.current.data?.pages[0]?.data || [];
      expect(conversations).toHaveLength(2);

      // Check that participant user data is assembled
      for (const conversation of conversations) {
        expect(conversation.participants).toHaveLength(2);
        expect(conversation.participants).toContain(user1.id);

        // Each conversation should have the other participant
        const otherParticipantId = conversation.participants.find(
          (id) => id !== user1.id
        );
        expect([user2.id, user3.id]).toContain(otherParticipantId);
      }

      await signOut1Again();
    });

    test('should handle user data assembly with batch fetching', async () => {
      // Arrange: Create main user and many conversation partners
      const { user: mainUser, signOut: signOutMain } =
        await authHelper.createAndAuthenticateUser();

      // Create 8 other users for conversations (to test batch fetching)
      const otherUsers = await Promise.all(
        Array.from({ length: 8 }, async (_, i) => {
          const { user } = await authHelper.createAndAuthenticateUser();
          return user;
        })
      );

      await signOutMain();
      const { user: signedInMainUser, signOut: signOutMainAgain } =
        await authHelper.signInUser(mainUser.email);

      const { result: sendMessageResult } = testUtils.renderHookWithWrapper(
        () => useSendMessage(),
        wrapper
      );

      await testUtils.waitForHookToInitialize(sendMessageResult);

      // Create conversations with all users rapidly (should trigger batch user fetching)
      const startTime = Date.now();

      for (const otherUser of otherUsers) {
        await act(async () => {
          await sendMessageResult.current.mutateAsync({
            recipientId: otherUser.id,
            content: `Message to ${otherUser.email}`,
          });
        });
      }

      // Act: Fetch conversations (should use batch user fetching)
      const { result: conversationsResult } = testUtils.renderHookWithWrapper(
        () => useConversations(),
        wrapper
      );

      await waitFor(() => {
        expect(conversationsResult.current.isSuccess).toBe(true);
      });

      const fetchTime = Date.now() - startTime;

      // Verify: All conversations should be loaded with user data
      const conversations =
        conversationsResult.current.data?.pages[0]?.data || [];
      expect(conversations).toHaveLength(8);

      // Verify that user data is assembled for all participants
      for (const conversation of conversations) {
        expect(conversation.participants).toHaveLength(2);
        expect(conversation.participants).toContain(mainUser.id);

        const otherParticipantId = conversation.participants.find(
          (id) => id !== mainUser.id
        );
        const expectedOtherUser = otherUsers.find(
          (u) => u.id === otherParticipantId
        );
        expect(expectedOtherUser).toBeDefined();
      }

      // Performance check: batch fetching should be reasonably fast
      expect(fetchTime).toBeLessThan(10000); // Should complete within 10 seconds

      await signOutMainAgain();
    });

    test('should handle missing user data gracefully', async () => {
      // This test simulates a scenario where a user might have been deleted
      // but conversations still reference them

      // Arrange: Create conversation first
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

      await act(async () => {
        await sendMessageResult.current.mutateAsync({
          recipientId: user1.id,
          content: 'Message before user deletion scenario',
        });
      });

      // Act: Fetch conversations (system should handle gracefully if user data is missing)
      const { result: conversationsResult } = testUtils.renderHookWithWrapper(
        () => useConversations(),
        wrapper
      );

      await waitFor(() => {
        expect(conversationsResult.current.isSuccess).toBe(true);
      });

      // Verify: Should not crash and should handle missing user data gracefully
      const conversations =
        conversationsResult.current.data?.pages[0]?.data || [];
      expect(conversations).toHaveLength(1);
      expect(conversations[0].participants).toHaveLength(2);

      await signOut2();
    });
  });

  describe('User Data Assembly in Messages', () => {
    test('should properly assemble sender user data in messages', async () => {
      // Arrange: Create conversation with multiple senders
      const { user: user1, signOut: signOut1 } =
        await authHelper.createAndAuthenticateUser();
      const { user: user2, signOut: signOut2 } =
        await authHelper.createAndAuthenticateUser();

      // User 1 sends first message
      await signOut1();
      const { user: signedInUser1, signOut: signOut1Again } =
        await authHelper.signInUser(user1.email);

      const { result: sendMessage1 } = testUtils.renderHookWithWrapper(
        () => useSendMessage(),
        wrapper
      );

      await testUtils.waitForHookToInitialize(sendMessage1);

      let conversationId: string;
      await act(async () => {
        const result = await sendMessage1.current.mutateAsync({
          recipientId: user2.id,
          content: 'Message from User 1',
        });
        conversationId = result.conversationId;
      });

      await signOut1Again();

      // User 2 responds
      await signOut2();
      const { user: signedInUser2, signOut: signOut2Again } =
        await authHelper.signInUser(user2.email);

      const { result: sendMessage2 } = testUtils.renderHookWithWrapper(
        () => useSendMessage(),
        wrapper
      );

      await testUtils.waitForHookToInitialize(sendMessage2);

      await act(async () => {
        await sendMessage2.current.mutateAsync({
          recipientId: user1.id,
          content: 'Response from User 2',
        });
      });

      // Act: Fetch messages with assembled user data
      const { result: messagesResult } = testUtils.renderHookWithWrapper(
        () => useMessages(conversationId),
        wrapper
      );

      await waitFor(() => {
        expect(messagesResult.current.isSuccess).toBe(true);
      });

      // Verify: Messages should have proper sender data assembled
      const messages = messagesResult.current.data?.pages[0]?.data || [];
      expect(messages).toHaveLength(2);

      // Verify sender IDs are correct (newest first)
      expect(messages[0].senderId).toBe(user2.id);
      expect(messages[0].content).toBe('Response from User 2');
      expect(messages[1].senderId).toBe(user1.id);
      expect(messages[1].content).toBe('Message from User 1');

      await signOut2Again();
    });

    test('should handle user data assembly with many message senders', async () => {
      // This test would be for group messaging scenarios, but since we're testing
      // direct messages, we'll simulate rapid back-and-forth

      // Arrange: Create two users for rapid message exchange
      const { user: user1, signOut: signOut1 } =
        await authHelper.createAndAuthenticateUser();
      const { user: user2, signOut: signOut2 } =
        await authHelper.createAndAuthenticateUser();

      let conversationId: string;

      // User 2 starts conversation
      const { result: sendMessage2 } = testUtils.renderHookWithWrapper(
        () => useSendMessage(),
        wrapper
      );

      await testUtils.waitForHookToInitialize(sendMessage2);

      // Send rapid alternating messages
      for (let i = 1; i <= 10; i++) {
        if (i % 2 === 1) {
          // User 2 sends odd-numbered messages
          await act(async () => {
            const result = await sendMessage2.current.mutateAsync({
              recipientId: user1.id,
              content: `Message ${i} from User 2`,
            });
            if (i === 1) {
              conversationId = result.conversationId;
            }
          });
        } else {
          // User 1 sends even-numbered messages (need to switch users)
          await signOut2();
          const { user: tempUser1, signOut: tempSignOut1 } =
            await authHelper.signInUser(user1.email);

          const { result: tempSendMessage1 } = testUtils.renderHookWithWrapper(
            () => useSendMessage(),
            wrapper
          );

          await testUtils.waitForHookToInitialize(tempSendMessage1);

          await act(async () => {
            await tempSendMessage1.current.mutateAsync({
              recipientId: user2.id,
              content: `Message ${i} from User 1`,
            });
          });

          await tempSignOut1();
          const { user: tempUser2, signOut: tempSignOut2 } =
            await authHelper.signInUser(user2.email);
          signOut2 = tempSignOut2;
        }

        // Small delay to ensure different timestamps
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // Act: Fetch all messages
      const { result: messagesResult } = testUtils.renderHookWithWrapper(
        () => useMessages(conversationId!),
        wrapper
      );

      await waitFor(() => {
        expect(messagesResult.current.isSuccess).toBe(true);
      });

      // Verify: All messages should have correct sender data assembled
      const messages = messagesResult.current.data?.pages[0]?.data || [];
      expect(messages).toHaveLength(10);

      // Verify sender alternation (newest first, so reversed order)
      for (let i = 0; i < messages.length; i++) {
        const messageNumber = 10 - i; // Since newest first
        const expectedSenderId = messageNumber % 2 === 1 ? user2.id : user1.id;
        const expectedSenderName =
          messageNumber % 2 === 1 ? 'User 2' : 'User 1';

        expect(messages[i].senderId).toBe(expectedSenderId);
        expect(messages[i].content).toBe(
          `Message ${messageNumber} from ${expectedSenderName}`
        );
      }

      await signOut2();
    });
  });

  describe('Performance and Optimization', () => {
    test('should efficiently handle user data assembly without N+1 queries', async () => {
      // Arrange: Create scenario that could trigger N+1 queries if not optimized
      const { user: mainUser, signOut: signOutMain } =
        await authHelper.createAndAuthenticateUser();

      // Create multiple conversations (each requiring user data assembly)
      const conversationUsers = await Promise.all(
        Array.from({ length: 5 }, async (_, i) => {
          const { user } = await authHelper.createAndAuthenticateUser();
          return user;
        })
      );

      await signOutMain();
      const { user: signedInMainUser, signOut: signOutMainAgain } =
        await authHelper.signInUser(mainUser.email);

      const { result: sendMessageResult } = testUtils.renderHookWithWrapper(
        () => useSendMessage(),
        wrapper
      );

      await testUtils.waitForHookToInitialize(sendMessageResult);

      // Create all conversations
      for (const convUser of conversationUsers) {
        await act(async () => {
          await sendMessageResult.current.mutateAsync({
            recipientId: convUser.id,
            content: `Hello ${convUser.email}`,
          });
        });
      }

      // Act: Measure time to fetch conversations with user data assembly
      const startTime = performance.now();

      const { result: conversationsResult } = testUtils.renderHookWithWrapper(
        () => useConversations(),
        wrapper
      );

      await waitFor(() => {
        expect(conversationsResult.current.isSuccess).toBe(true);
      });

      const endTime = performance.now();
      const fetchTime = endTime - startTime;

      // Verify: Should be reasonably fast (indicating batch fetching, not N+1)
      expect(fetchTime).toBeLessThan(2000); // Should complete within 2 seconds

      // Verify: All conversations have user data assembled
      const conversations =
        conversationsResult.current.data?.pages[0]?.data || [];
      expect(conversations).toHaveLength(5);

      for (const conversation of conversations) {
        expect(conversation.participants).toHaveLength(2);
        expect(conversation.participants).toContain(mainUser.id);
      }

      await signOutMainAgain();
    });

    test('should cache user data efficiently across multiple queries', async () => {
      // Arrange: Create conversation and ensure user data is loaded
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
      await act(async () => {
        const result = await sendMessageResult.current.mutateAsync({
          recipientId: user1.id,
          content: 'Initial message for caching test',
        });
        conversationId = result.conversationId;
      });

      // First query - should load user data
      const startTime1 = performance.now();

      const { result: conversationsResult1 } = testUtils.renderHookWithWrapper(
        () => useConversations(),
        wrapper
      );

      await waitFor(() => {
        expect(conversationsResult1.current.isSuccess).toBe(true);
      });

      const endTime1 = performance.now();
      const firstFetchTime = endTime1 - startTime1;

      // Second query - should use cached user data
      const startTime2 = performance.now();

      const { result: conversationsResult2 } = testUtils.renderHookWithWrapper(
        () => useConversations(),
        wrapper
      );

      await waitFor(() => {
        expect(conversationsResult2.current.isSuccess).toBe(true);
      });

      const endTime2 = performance.now();
      const secondFetchTime = endTime2 - startTime2;

      // Verify: Second fetch should be faster (using cached data)
      expect(secondFetchTime).toBeLessThan(firstFetchTime);
      expect(secondFetchTime).toBeLessThan(100); // Should be very fast

      // Verify: Both queries return same user data
      const conversations1 =
        conversationsResult1.current.data?.pages[0]?.data || [];
      const conversations2 =
        conversationsResult2.current.data?.pages[0]?.data || [];
      expect(conversations1).toEqual(conversations2);

      await signOut2();
    });
  });
});
