import { describe, test, expect, beforeAll, beforeEach, afterEach, afterAll } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { 
  useConversations, 
  useMessages, 
  useSendMessage, 
  useMarkAsRead 
} from "@belongnetwork/platform";
import { 
  TestDataFactory, 
  authHelper, 
  cleanupHelper, 
  testWrapperManager, 
  testUtils 
} from "../helpers";

describe("Conversations Cache Invalidation Integration Tests", () => {
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

  describe("Message Cache Invalidation", () => {
    test("should invalidate conversations cache when sending new message", async () => {
      // Arrange: Create two users
      const { user: user1, signOut: signOut1 } = await authHelper.createAndAuthenticateUser();
      await signOut1();
      
      const { user: user2, signOut: signOut2 } = await authHelper.createAndAuthenticateUser();
      
      // Get initial conversations state (should be empty)
      const { result: conversationsResult } = testUtils.renderHookWithWrapper(
        () => useConversations(),
        wrapper
      );

      await waitFor(() => {
        expect(conversationsResult.current.isSuccess).toBe(true);
      });

      const initialConversations = conversationsResult.current.data?.pages[0]?.data || [];
      expect(initialConversations).toHaveLength(0);

      // Act: Send a message
      const { result: sendMessageResult } = testUtils.renderHookWithWrapper(
        () => useSendMessage(),
        wrapper
      );
      
      await testUtils.waitForHookToInitialize(sendMessageResult);
      
      await act(async () => {
        await sendMessageResult.current.mutateAsync({
          recipientId: user1.id,
          content: "Cache invalidation test message"
        });
      });

      // Verify: Conversations cache should be updated automatically
      await waitFor(() => {
        const updatedConversations = conversationsResult.current.data?.pages[0]?.data || [];
        expect(updatedConversations).toHaveLength(1);
        expect(updatedConversations[0].lastMessage?.content).toBe("Cache invalidation test message");
      });

      await signOut2();
    });

    test("should invalidate messages cache when sending message to existing conversation", async () => {
      // Arrange: Create conversation with initial message
      const { user: user1, signOut: signOut1 } = await authHelper.createAndAuthenticateUser();
      await signOut1();
      
      const { user: user2, signOut: signOut2 } = await authHelper.createAndAuthenticateUser();
      
      const { result: sendMessageResult } = testUtils.renderHookWithWrapper(
        () => useSendMessage(),
        wrapper
      );
      
      await testUtils.waitForHookToInitialize(sendMessageResult);
      
      let conversationId: string;
      await act(async () => {
        const result = await sendMessageResult.current.mutateAsync({
          recipientId: user1.id,
          content: "Initial message"
        });
        conversationId = result.conversationId;
      });

      // Get messages for the conversation
      const { result: messagesResult } = testUtils.renderHookWithWrapper(
        () => useMessages(conversationId),
        wrapper
      );

      await waitFor(() => {
        expect(messagesResult.current.isSuccess).toBe(true);
      });

      const initialMessages = messagesResult.current.data?.pages[0]?.data || [];
      expect(initialMessages).toHaveLength(1);

      // Act: Send another message to the same conversation
      await act(async () => {
        await sendMessageResult.current.mutateAsync({
          recipientId: user1.id,
          content: "Second message for cache test"
        });
      });

      // Verify: Messages cache should be updated automatically
      await waitFor(() => {
        const updatedMessages = messagesResult.current.data?.pages[0]?.data || [];
        expect(updatedMessages).toHaveLength(2);
        expect(updatedMessages[0].content).toBe("Second message for cache test"); // Newest first
        expect(updatedMessages[1].content).toBe("Initial message");
      });

      await signOut2();
    });

    test("should invalidate cache when marking message as read", async () => {
      // Arrange: Create conversation with unread message
      const { user: user1, signOut: signOut1 } = await authHelper.createAndAuthenticateUser();
      await signOut1();
      
      const { user: user2, signOut: signOut2 } = await authHelper.createAndAuthenticateUser();
      
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
          content: "Unread message for cache test"
        });
        conversationId = result.conversationId;
      });

      await signOut2();

      // User 1 signs in and views messages
      const { user: signedInUser1, signOut: signOut1Again } = await authHelper.signInUser(user1.email);
      
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
          messageId: messages[0].id
        });
      });

      // Verify: Messages cache should be updated to show read status
      await waitFor(() => {
        const updatedMessages = messagesResult.current.data?.pages[0]?.data || [];
        expect(updatedMessages[0].readAt).not.toBeNull();
      });

      await signOut1Again();
    });
  });

  describe("Cross-User Cache Consistency", () => {
    test("should maintain cache consistency across multiple conversation queries", async () => {
      // Arrange: Create three users
      const { user: user1, signOut: signOut1 } = await authHelper.createAndAuthenticateUser();
      const { user: user2, signOut: signOut2 } = await authHelper.createAndAuthenticateUser();
      const { user: user3, signOut: signOut3 } = await authHelper.createAndAuthenticateUser();

      // User 1 creates conversations with both User 2 and User 3
      await signOut1();
      const { user: signedInUser1, signOut: signOut1Again } = await authHelper.signInUser(user1.email);
      
      const { result: sendMessageResult } = testUtils.renderHookWithWrapper(
        () => useSendMessage(),
        wrapper
      );
      
      await testUtils.waitForHookToInitialize(sendMessageResult);
      
      let conversation1Id: string, conversation2Id: string;
      
      // Create conversation with User 2
      await act(async () => {
        const result = await sendMessageResult.current.mutateAsync({
          recipientId: user2.id,
          content: "Message to User 2"
        });
        conversation1Id = result.conversationId;
      });

      // Create conversation with User 3
      await act(async () => {
        const result = await sendMessageResult.current.mutateAsync({
          recipientId: user3.id,
          content: "Message to User 3"
        });
        conversation2Id = result.conversationId;
      });

      // Get conversations list
      const { result: conversationsResult } = testUtils.renderHookWithWrapper(
        () => useConversations(),
        wrapper
      );

      await waitFor(() => {
        expect(conversationsResult.current.isSuccess).toBe(true);
      });

      const conversations = conversationsResult.current.data?.pages[0]?.data || [];
      expect(conversations).toHaveLength(2);

      // Get messages for both conversations
      const { result: messages1Result } = testUtils.renderHookWithWrapper(
        () => useMessages(conversation1Id),
        wrapper
      );

      const { result: messages2Result } = testUtils.renderHookWithWrapper(
        () => useMessages(conversation2Id),
        wrapper
      );

      await waitFor(() => {
        expect(messages1Result.current.isSuccess).toBe(true);
        expect(messages2Result.current.isSuccess).toBe(true);
      });

      // Act: Send new message to conversation 1
      await act(async () => {
        await sendMessageResult.current.mutateAsync({
          recipientId: user2.id,
          content: "Updated message to User 2"
        });
      });

      // Verify: Conversation 1 should be updated in all relevant caches
      await waitFor(() => {
        // Conversations list should show updated last message
        const updatedConversations = conversationsResult.current.data?.pages[0]?.data || [];
        const conversation1 = updatedConversations.find(c => 
          c.participants.includes(user1.id) && c.participants.includes(user2.id)
        );
        expect(conversation1?.lastMessage?.content).toBe("Updated message to User 2");

        // Messages for conversation 1 should be updated
        const updatedMessages1 = messages1Result.current.data?.pages[0]?.data || [];
        expect(updatedMessages1[0].content).toBe("Updated message to User 2");

        // Messages for conversation 2 should remain unchanged
        const messages2 = messages2Result.current.data?.pages[0]?.data || [];
        expect(messages2[0].content).toBe("Message to User 3");
      });

      await signOut1Again();
    });

    test("should handle cache invalidation with rapid successive operations", async () => {
      // Arrange: Create two users and rapid message sending scenario
      const { user: user1, signOut: signOut1 } = await authHelper.createAndAuthenticateUser();
      await signOut1();
      
      const { user: user2, signOut: signOut2 } = await authHelper.createAndAuthenticateUser();
      
      const { result: sendMessageResult } = testUtils.renderHookWithWrapper(
        () => useSendMessage(),
        wrapper
      );
      
      await testUtils.waitForHookToInitialize(sendMessageResult);
      
      let conversationId: string;

      // Act: Send multiple messages rapidly
      const messagePromises: Promise<any>[] = [];
      
      for (let i = 1; i <= 5; i++) {
        const promise = act(async () => {
          const result = await sendMessageResult.current.mutateAsync({
            recipientId: user1.id,
            content: `Rapid message ${i}`
          });
          if (i === 1) {
            conversationId = result.conversationId;
          }
          return result;
        });
        messagePromises.push(promise);
      }

      await Promise.all(messagePromises);

      // Verify: All messages should be reflected in cache
      const { result: messagesResult } = testUtils.renderHookWithWrapper(
        () => useMessages(conversationId!),
        wrapper
      );

      await waitFor(() => {
        expect(messagesResult.current.isSuccess).toBe(true);
      });

      const messages = messagesResult.current.data?.pages[0]?.data || [];
      expect(messages).toHaveLength(5);
      
      // Verify all messages are present (newest first)
      expect(messages[0].content).toBe("Rapid message 5");
      expect(messages[4].content).toBe("Rapid message 1");

      await signOut2();
    });
  });

  describe("Cache Staleness and Refetching", () => {
    test("should respect stale time configuration for conversations", async () => {
      // Arrange: Create conversation
      const { user: user1, signOut: signOut1 } = await authHelper.createAndAuthenticateUser();
      await signOut1();
      
      const { user: user2, signOut: signOut2 } = await authHelper.createAndAuthenticateUser();
      
      const { result: sendMessageResult } = testUtils.renderHookWithWrapper(
        () => useSendMessage(),
        wrapper
      );
      
      await testUtils.waitForHookToInitialize(sendMessageResult);
      
      await act(async () => {
        await sendMessageResult.current.mutateAsync({
          recipientId: user1.id,
          content: "Initial message for stale time test"
        });
      });

      // Get conversations (should be fresh)
      const { result: conversationsResult1 } = testUtils.renderHookWithWrapper(
        () => useConversations(),
        wrapper
      );

      await waitFor(() => {
        expect(conversationsResult1.current.isSuccess).toBe(true);
      });

      const firstFetchTime = Date.now();
      
      // Immediately create another hook instance (should use cached data)
      const { result: conversationsResult2 } = testUtils.renderHookWithWrapper(
        () => useConversations(),
        wrapper
      );

      await waitFor(() => {
        expect(conversationsResult2.current.isSuccess).toBe(true);
      });

      // Verify: Second fetch should be nearly instantaneous (using cache)
      const secondFetchTime = Date.now();
      expect(secondFetchTime - firstFetchTime).toBeLessThan(100); // Should be very fast

      // Verify both hooks have same data
      const conversations1 = conversationsResult1.current.data?.pages[0]?.data || [];
      const conversations2 = conversationsResult2.current.data?.pages[0]?.data || [];
      expect(conversations1).toEqual(conversations2);

      await signOut2();
    });

    test("should handle manual cache invalidation", async () => {
      // Arrange: Create conversation and populate cache
      const { user: user1, signOut: signOut1 } = await authHelper.createAndAuthenticateUser();
      await signOut1();
      
      const { user: user2, signOut: signOut2 } = await authHelper.createAndAuthenticateUser();
      
      const { result: sendMessageResult } = testUtils.renderHookWithWrapper(
        () => useSendMessage(),
        wrapper
      );
      
      await testUtils.waitForHookToInitialize(sendMessageResult);
      
      let conversationId: string;
      await act(async () => {
        const result = await sendMessageResult.current.mutateAsync({
          recipientId: user1.id,
          content: "Message before cache clear"
        });
        conversationId = result.conversationId;
      });

      const { result: messagesResult } = testUtils.renderHookWithWrapper(
        () => useMessages(conversationId),
        wrapper
      );

      await waitFor(() => {
        expect(messagesResult.current.isSuccess).toBe(true);
      });

      // Act: Clear cache manually
      await act(async () => {
        testWrapperManager.clearCache();
      });

      // Send another message (should refetch from server)
      await act(async () => {
        await sendMessageResult.current.mutateAsync({
          recipientId: user1.id,
          content: "Message after cache clear"
        });
      });

      // Verify: Should have both messages (cache was cleared and refetched)
      await waitFor(() => {
        const messages = messagesResult.current.data?.pages[0]?.data || [];
        expect(messages).toHaveLength(2);
        expect(messages[0].content).toBe("Message after cache clear");
        expect(messages[1].content).toBe("Message before cache clear");
      });

      await signOut2();
    });
  });

  describe("Error Handling and Cache State", () => {
    test("should handle cache state during failed operations", async () => {
      // Arrange: Create authenticated user
      const { user, signOut } = await authHelper.createAndAuthenticateUser();
      
      const { result: sendMessageResult } = testUtils.renderHookWithWrapper(
        () => useSendMessage(),
        wrapper
      );
      
      await testUtils.waitForHookToInitialize(sendMessageResult);

      // Get initial conversations state
      const { result: conversationsResult } = testUtils.renderHookWithWrapper(
        () => useConversations(),
        wrapper
      );

      await waitFor(() => {
        expect(conversationsResult.current.isSuccess).toBe(true);
      });

      const initialConversations = conversationsResult.current.data?.pages[0]?.data || [];

      // Act: Try to send message to non-existent user (should fail)
      await act(async () => {
        try {
          await sendMessageResult.current.mutateAsync({
            recipientId: "non-existent-user-id",
            content: "This should fail"
          });
        } catch (error) {
          // Expected to fail
        }
      });

      // Verify: Conversations cache should remain unchanged after failed operation
      await waitFor(() => {
        const currentConversations = conversationsResult.current.data?.pages[0]?.data || [];
        expect(currentConversations).toEqual(initialConversations);
      });

      await signOut();
    });
  });
});