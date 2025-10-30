import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import {
  createTestCommunity,
  createTestUser,
  TEST_PREFIX,
} from '../helpers/test-data';
import { sendMessage } from '@/features/messaging/api';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities/types';
import { joinCommunity } from '@/features/communities/api';
import { createTestConversation, signInAsUser } from './messaging-helpers';
import type {
  RealtimeBroadcastMessage,
  MessagePayload,
  Conversation,
} from '@/features/messaging/types';
import { messagesChannelForConversation } from '@/features/messaging/utils';
import { faker } from '@faker-js/faker';

describe('Messaging Real-time Reliability Tests', () => {
  let supabase: SupabaseClient<Database>;
  let userAClient: SupabaseClient<Database>;
  let userBClient: SupabaseClient<Database>;
  let userCClient: SupabaseClient<Database>;
  let userA: Account;
  let userB: Account;
  let userC: Account;
  let testCommunity: Community;
  let conversation: Conversation;
  let channelForUserA: RealtimeChannel | null = null;
  let channelForUserB: RealtimeChannel | null = null;
  let receivedMessagesUserA: RealtimeBroadcastMessage[] = [];
  let receivedMessagesUserB: RealtimeBroadcastMessage[] = [];

  beforeAll(async () => {
    supabase = createTestClient();
    userAClient = createTestClient();
    userBClient = createTestClient();
    userCClient = createTestClient();

    // Create three test users
    userA = await createTestUser(userAClient);
    testCommunity = await createTestCommunity(userAClient);

    userB = await createTestUser(userBClient);
    await joinCommunity(userBClient, userB.id, testCommunity.id);

    userC = await createTestUser(userCClient);
    await joinCommunity(userCClient, userC.id, testCommunity.id);

    // Create conversation between userA and userB
    await signInAsUser(userAClient, userA);
    conversation = await createTestConversation(userAClient, userB.id);

    // Set up subscriptions for both users
    const conversationTopic = messagesChannelForConversation(conversation.id);

    channelForUserA = userAClient
      .channel(conversationTopic, {
        config: { private: true },
      })
      .on('broadcast', { event: '*' }, (message: RealtimeBroadcastMessage) => {
        receivedMessagesUserA.push(message);
      })
      .subscribe();

    await signInAsUser(userBClient, userB);
    channelForUserB = userBClient
      .channel(conversationTopic, {
        config: { private: true },
      })
      .on('broadcast', { event: '*' }, (message: RealtimeBroadcastMessage) => {
        receivedMessagesUserB.push(message);
      })
      .subscribe();

    // Wait for subscriptions to be fully established
    await new Promise((resolve) => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    await channelForUserA?.unsubscribe();
    await channelForUserB?.unsubscribe();
    await cleanupAllTestData();
  });

  beforeEach(() => {
    // Clear received messages before each test
    receivedMessagesUserA = [];
    receivedMessagesUserB = [];
  });

  describe('Duplicate Message Detection', () => {
    it('should receive exactly one copy of each message', async () => {
      await signInAsUser(userAClient, userA);

      const content = `${TEST_PREFIX} duplicate detection test`;
      const sentMessage = await sendMessage(userAClient, userA.id, {
        conversationId: conversation.id,
        content,
      });

      // Wait for message delivery
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // UserB should receive exactly 1 message
      expect(receivedMessagesUserB).toHaveLength(1);

      const payload = receivedMessagesUserB[0].payload as MessagePayload;
      expect(payload.message_id).toBe(sentMessage.id);
      expect(payload.content).toBe(content);

      // UserA should NOT receive their own message (self: false)
      expect(receivedMessagesUserA).toHaveLength(0);
    });

    it('should not receive duplicate messages when sending multiple messages', async () => {
      await signInAsUser(userAClient, userA);

      const messages = [];
      for (let i = 0; i < 5; i++) {
        const msg = await sendMessage(userAClient, userA.id, {
          conversationId: conversation.id,
          content: `${TEST_PREFIX} message ${i}`,
        });
        messages.push(msg);
        // Small delay between sends
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      // Wait for all messages to arrive
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // UserB should receive exactly 5 messages
      expect(receivedMessagesUserB).toHaveLength(5);

      // Extract message IDs from received messages
      const receivedIds = receivedMessagesUserB.map(
        (m) => (m.payload as MessagePayload).message_id,
      );

      // Check for duplicates
      const uniqueIds = new Set(receivedIds);
      expect(uniqueIds.size).toBe(5);

      // Verify all sent message IDs are in received IDs
      messages.forEach((msg) => {
        expect(receivedIds).toContain(msg.id);
      });
    });

    it('should ensure sender does not receive their own messages', async () => {
      await signInAsUser(userBClient, userB);

      await sendMessage(userBClient, userB.id, {
        conversationId: conversation.id,
        content: `${TEST_PREFIX} self message test`,
      });

      await new Promise((resolve) => setTimeout(resolve, 1500));

      // UserB (sender) should not receive their own message
      expect(receivedMessagesUserB).toHaveLength(0);

      // UserA (recipient) should receive it
      expect(receivedMessagesUserA).toHaveLength(1);
    });
  });

  describe('Message Delivery Completeness', () => {
    it('should deliver all messages when sending rapidly', async () => {
      await signInAsUser(userAClient, userA);

      const messageCount = 10;
      const sentMessages = [];

      // Send messages rapidly without waiting
      for (let i = 0; i < messageCount; i++) {
        const msg = await sendMessage(userAClient, userA.id, {
          conversationId: conversation.id,
          content: `${TEST_PREFIX} rapid message ${i}`,
        });
        sentMessages.push(msg);
      }

      // Wait for all messages to arrive
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // UserB should receive exactly 10 messages
      expect(receivedMessagesUserB).toHaveLength(messageCount);

      // Verify all message IDs are accounted for
      const receivedIds = receivedMessagesUserB.map(
        (m) => (m.payload as MessagePayload).message_id,
      );
      sentMessages.forEach((msg) => {
        expect(receivedIds).toContain(msg.id);
      });
    });

    it('should deliver all messages and match database state', async () => {
      await signInAsUser(userAClient, userA);

      const messageCount = 5;
      const sentMessages = [];

      for (let i = 0; i < messageCount; i++) {
        const msg = await sendMessage(userAClient, userA.id, {
          conversationId: conversation.id,
          content: `${TEST_PREFIX} db verification ${i}`,
        });
        sentMessages.push(msg);
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Query database for these messages
      const { data: dbMessages, error } = await supabase
        .from('messages')
        .select('id, content')
        .eq('conversation_id', conversation.id)
        .in(
          'id',
          sentMessages.map((m) => m.id),
        )
        .order('created_at', { ascending: true });

      expect(error).toBeNull();
      expect(dbMessages).toHaveLength(messageCount);

      // Verify realtime received count matches database count
      expect(receivedMessagesUserB).toHaveLength(messageCount);

      // Verify message IDs match
      const dbIds = dbMessages!.map((m) => m.id);
      const receivedIds = receivedMessagesUserB.map(
        (m) => (m.payload as MessagePayload).message_id,
      );

      dbIds.forEach((id) => {
        expect(receivedIds).toContain(id);
      });
    });

    it('should handle large message bursts without loss', async () => {
      await signInAsUser(userAClient, userA);

      const messageCount = 20;
      const sentMessageIds: string[] = [];

      // Send burst of messages
      const promises = [];
      for (let i = 0; i < messageCount; i++) {
        promises.push(
          sendMessage(userAClient, userA.id, {
            conversationId: conversation.id,
            content: `${TEST_PREFIX} burst ${i}`,
          }),
        );
      }

      const sentMessages = await Promise.all(promises);
      sentMessageIds.push(...sentMessages.map((m) => m.id));

      // Wait for delivery
      await new Promise((resolve) => setTimeout(resolve, 4000));

      // Verify count
      expect(receivedMessagesUserB).toHaveLength(messageCount);

      // Verify all IDs present and no duplicates
      const receivedIds = receivedMessagesUserB.map(
        (m) => (m.payload as MessagePayload).message_id,
      );
      const uniqueReceivedIds = new Set(receivedIds);

      expect(uniqueReceivedIds.size).toBe(messageCount);
      sentMessageIds.forEach((id) => {
        expect(receivedIds).toContain(id);
      });
    });
  });

  describe('Concurrent Multi-User Messaging', () => {
    it('should handle messages from multiple users simultaneously', async () => {
      // UserA and UserB both send messages to the conversation
      await signInAsUser(userAClient, userA);
      await signInAsUser(userBClient, userB);

      const messagesFromA = [];
      const messagesFromB = [];

      // Send messages concurrently
      const promisesA = [];
      const promisesB = [];

      for (let i = 0; i < 5; i++) {
        promisesA.push(
          sendMessage(userAClient, userA.id, {
            conversationId: conversation.id,
            content: `${TEST_PREFIX} from A ${i}`,
          }),
        );
        promisesB.push(
          sendMessage(userBClient, userB.id, {
            conversationId: conversation.id,
            content: `${TEST_PREFIX} from B ${i}`,
          }),
        );
      }

      const resultsA = await Promise.all(promisesA);
      const resultsB = await Promise.all(promisesB);

      messagesFromA.push(...resultsA);
      messagesFromB.push(...resultsB);

      await new Promise((resolve) => setTimeout(resolve, 4000));

      // UserA should receive 5 messages from UserB (not their own)
      expect(receivedMessagesUserA).toHaveLength(5);
      const receivedByA = receivedMessagesUserA.map(
        (m) => (m.payload as MessagePayload).message_id,
      );
      messagesFromB.forEach((msg) => {
        expect(receivedByA).toContain(msg.id);
      });

      // UserB should receive 5 messages from UserA (not their own)
      expect(receivedMessagesUserB).toHaveLength(5);
      const receivedByB = receivedMessagesUserB.map(
        (m) => (m.payload as MessagePayload).message_id,
      );
      messagesFromA.forEach((msg) => {
        expect(receivedByB).toContain(msg.id);
      });
    });

    it('should maintain message integrity with interleaved sends', async () => {
      await signInAsUser(userAClient, userA);
      await signInAsUser(userBClient, userB);

      const allSentMessages = [];

      // Interleave sends
      for (let i = 0; i < 5; i++) {
        const msgA = await sendMessage(userAClient, userA.id, {
          conversationId: conversation.id,
          content: `${TEST_PREFIX} A-${i}`,
        });
        allSentMessages.push(msgA);

        await new Promise((resolve) => setTimeout(resolve, 100));

        const msgB = await sendMessage(userBClient, userB.id, {
          conversationId: conversation.id,
          content: `${TEST_PREFIX} B-${i}`,
        });
        allSentMessages.push(msgB);

        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Each user should have received 5 messages from the other
      expect(receivedMessagesUserA).toHaveLength(5);
      expect(receivedMessagesUserB).toHaveLength(5);

      // Verify no duplicates
      const receivedByA = receivedMessagesUserA.map(
        (m) => (m.payload as MessagePayload).message_id,
      );
      const receivedByB = receivedMessagesUserB.map(
        (m) => (m.payload as MessagePayload).message_id,
      );

      expect(new Set(receivedByA).size).toBe(5);
      expect(new Set(receivedByB).size).toBe(5);
    });
  });

  describe('Message Ordering Validation', () => {
    it('should maintain message order when sent sequentially', async () => {
      await signInAsUser(userAClient, userA);

      const messages = [];
      const contents = ['First', 'Second', 'Third', 'Fourth', 'Fifth'];

      for (const content of contents) {
        const msg = await sendMessage(userAClient, userA.id, {
          conversationId: conversation.id,
          content: `${TEST_PREFIX} ${content}`,
        });
        messages.push(msg);
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));

      expect(receivedMessagesUserB).toHaveLength(5);

      // Verify order matches
      const receivedContents = receivedMessagesUserB.map(
        (m) => (m.payload as MessagePayload).content,
      );

      contents.forEach((content, index) => {
        expect(receivedContents[index]).toBe(`${TEST_PREFIX} ${content}`);
      });
    });

    it('should have monotonically increasing timestamps', async () => {
      await signInAsUser(userAClient, userA);

      for (let i = 0; i < 5; i++) {
        await sendMessage(userAClient, userA.id, {
          conversationId: conversation.id,
          content: `${TEST_PREFIX} timestamp test ${i}`,
        });
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));

      expect(receivedMessagesUserB).toHaveLength(5);

      // Check timestamps are increasing
      for (let i = 1; i < receivedMessagesUserB.length; i++) {
        const prevTime = new Date(
          (receivedMessagesUserB[i - 1].payload as MessagePayload).sent_at,
        ).getTime();
        const currTime = new Date(
          (receivedMessagesUserB[i].payload as MessagePayload).sent_at,
        ).getTime();

        expect(currTime).toBeGreaterThanOrEqual(prevTime);
      }
    });
  });

  describe('Subscription Lifecycle Reliability', () => {
    it('should not receive messages sent before subscription', async () => {
      // Create a new conversation for this test
      const newUserClient = createTestClient();
      const newUser = await createTestUser(newUserClient);
      await joinCommunity(newUserClient, newUser.id, testCommunity.id);

      await signInAsUser(userAClient, userA);
      const newConversation = await createTestConversation(
        userAClient,
        newUser.id,
      );

      // Send a message BEFORE the new user subscribes
      const earlyMessage = await sendMessage(userAClient, userA.id, {
        conversationId: newConversation.id,
        content: `${TEST_PREFIX} sent before subscription`,
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Now subscribe as the new user
      const receivedByNewUser: RealtimeBroadcastMessage[] = [];
      const conversationTopic = messagesChannelForConversation(
        newConversation.id,
      );

      await signInAsUser(newUserClient, newUser);
      const newChannel = newUserClient
        .channel(conversationTopic, {
          config: { private: true },
        })
        .on(
          'broadcast',
          { event: '*' },
          (message: RealtimeBroadcastMessage) => {
            receivedByNewUser.push(message);
          },
        )
        .subscribe();

      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Should not have received the early message
      expect(receivedByNewUser).toHaveLength(0);

      // Send a new message after subscription
      await signInAsUser(userAClient, userA);
      await sendMessage(userAClient, userA.id, {
        conversationId: newConversation.id,
        content: `${TEST_PREFIX} sent after subscription`,
      });

      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Should receive this one
      expect(receivedByNewUser).toHaveLength(1);

      await newChannel?.unsubscribe();
    });

    it('should handle subscription establishment correctly', async () => {
      const newUserClient = createTestClient();
      const newUser = await createTestUser(newUserClient);
      await joinCommunity(newUserClient, newUser.id, testCommunity.id);

      await signInAsUser(userAClient, userA);
      const newConversation = await createTestConversation(
        userAClient,
        newUser.id,
      );

      const receivedByNewUser: RealtimeBroadcastMessage[] = [];
      let subscriptionStatus = '';

      const conversationTopic = messagesChannelForConversation(
        newConversation.id,
      );

      await signInAsUser(newUserClient, newUser);
      const newChannel = newUserClient
        .channel(conversationTopic, {
          config: { private: true },
        })
        .on(
          'broadcast',
          { event: '*' },
          (message: RealtimeBroadcastMessage) => {
            receivedByNewUser.push(message);
          },
        )
        .subscribe((status) => {
          subscriptionStatus = status;
        });

      // Wait for subscription to be established
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify subscription is active
      expect(subscriptionStatus).toBe('SUBSCRIBED');

      // Now send a message
      await signInAsUser(userAClient, userA);
      await sendMessage(userAClient, userA.id, {
        conversationId: newConversation.id,
        content: `${TEST_PREFIX} after established subscription`,
      });

      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Should receive the message
      expect(receivedByNewUser).toHaveLength(1);

      await newChannel?.unsubscribe();
    });
  });

  describe('Real Data Verification', () => {
    it('should match realtime messages with database records', async () => {
      await signInAsUser(userAClient, userA);

      const sentMessages = [];
      for (let i = 0; i < 5; i++) {
        const msg = await sendMessage(userAClient, userA.id, {
          conversationId: conversation.id,
          content: `${TEST_PREFIX} db match test ${i}`,
        });
        sentMessages.push(msg);
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Query database
      const { data: dbMessages } = await supabase
        .from('messages')
        .select('id, content, sender_id')
        .eq('conversation_id', conversation.id)
        .in(
          'id',
          sentMessages.map((m) => m.id),
        );

      expect(dbMessages).toHaveLength(5);

      // Verify each realtime message has a corresponding DB record
      receivedMessagesUserB.forEach((rtMsg) => {
        const payload = rtMsg.payload as MessagePayload;
        const dbMatch = dbMessages!.find((db) => db.id === payload.message_id);

        expect(dbMatch).toBeDefined();
        expect(dbMatch!.content).toBe(payload.content);
        expect(dbMatch!.sender_id).toBe(payload.sender_id);
      });
    });

    it('should verify message content integrity between realtime and database', async () => {
      await signInAsUser(userAClient, userA);

      const specialContent = `${TEST_PREFIX} Special content with unicode: café ☕ emoji 🎉`;
      const msg = await sendMessage(userAClient, userA.id, {
        conversationId: conversation.id,
        content: specialContent,
      });

      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Check realtime
      expect(receivedMessagesUserB).toHaveLength(1);
      const rtPayload = receivedMessagesUserB[0].payload as MessagePayload;
      expect(rtPayload.content).toBe(specialContent);

      // Check database
      const { data: dbMessage } = await supabase
        .from('messages')
        .select('content')
        .eq('id', msg.id)
        .single();

      expect(dbMessage!.content).toBe(specialContent);
      expect(rtPayload.content).toBe(dbMessage!.content);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message list initially', async () => {
      // Create fresh conversation
      const freshUserClient = createTestClient();
      const freshUser = await createTestUser(freshUserClient);
      await joinCommunity(freshUserClient, freshUser.id, testCommunity.id);

      await signInAsUser(userAClient, userA);
      const freshConversation = await createTestConversation(
        userAClient,
        freshUser.id,
      );

      // Verify no messages exist
      const { data: existingMessages } = await supabase
        .from('messages')
        .select('id')
        .eq('conversation_id', freshConversation.id);

      expect(existingMessages).toHaveLength(0);

      // Set up subscription
      const receivedByFreshUser: RealtimeBroadcastMessage[] = [];
      const conversationTopic = messagesChannelForConversation(
        freshConversation.id,
      );

      await signInAsUser(freshUserClient, freshUser);
      const freshChannel = freshUserClient
        .channel(conversationTopic, {
          config: { private: true },
        })
        .on(
          'broadcast',
          { event: '*' },
          (message: RealtimeBroadcastMessage) => {
            receivedByFreshUser.push(message);
          },
        )
        .subscribe();

      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Send first message
      await signInAsUser(userAClient, userA);
      await sendMessage(userAClient, userA.id, {
        conversationId: freshConversation.id,
        content: `${TEST_PREFIX} first ever message`,
      });

      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Should receive exactly 1 message
      expect(receivedByFreshUser).toHaveLength(1);

      await freshChannel?.unsubscribe();
    });

    it('should handle large message content correctly', async () => {
      await signInAsUser(userAClient, userA);

      const largeContent = `${TEST_PREFIX} ${'A'.repeat(2000)} large message test`;
      const msg = await sendMessage(userAClient, userA.id, {
        conversationId: conversation.id,
        content: largeContent,
      });

      await new Promise((resolve) => setTimeout(resolve, 2000));

      expect(receivedMessagesUserB).toHaveLength(1);
      const payload = receivedMessagesUserB[0].payload as MessagePayload;
      expect(payload.content).toBe(largeContent);
      expect(payload.content.length).toBeGreaterThan(2000);
    });

    it('should handle messages with special characters', async () => {
      await signInAsUser(userAClient, userA);

      const specialChars = `${TEST_PREFIX} Special: <>&"'\`{}[]()\\|/!@#$%^&*`;
      const msg = await sendMessage(userAClient, userA.id, {
        conversationId: conversation.id,
        content: specialChars,
      });

      await new Promise((resolve) => setTimeout(resolve, 1500));

      expect(receivedMessagesUserB).toHaveLength(1);
      const payload = receivedMessagesUserB[0].payload as MessagePayload;
      expect(payload.content).toBe(specialChars);
    });
  });

  describe('Race Condition Tests', () => {
    it('should handle message sent immediately after subscription', async () => {
      const quickUserClient = createTestClient();
      const quickUser = await createTestUser(quickUserClient);
      await joinCommunity(quickUserClient, quickUser.id, testCommunity.id);

      await signInAsUser(userAClient, userA);
      const quickConversation = await createTestConversation(
        userAClient,
        quickUser.id,
      );

      const receivedByQuickUser: RealtimeBroadcastMessage[] = [];
      const conversationTopic = messagesChannelForConversation(
        quickConversation.id,
      );

      await signInAsUser(quickUserClient, quickUser);
      const quickChannel = quickUserClient
        .channel(conversationTopic, {
          config: { private: true },
        })
        .on(
          'broadcast',
          { event: '*' },
          (message: RealtimeBroadcastMessage) => {
            receivedByQuickUser.push(message);
          },
        )
        .subscribe();

      // Wait minimal time
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Send message very quickly after subscription
      await signInAsUser(userAClient, userA);
      await sendMessage(userAClient, userA.id, {
        conversationId: quickConversation.id,
        content: `${TEST_PREFIX} quick message`,
      });

      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Should still receive the message
      expect(receivedByQuickUser.length).toBeGreaterThanOrEqual(1);

      await quickChannel?.unsubscribe();
    });

    it('should handle rapid subscribe/unsubscribe cycles', async () => {
      const cycleUserClient = createTestClient();
      const cycleUser = await createTestUser(cycleUserClient);
      await joinCommunity(cycleUserClient, cycleUser.id, testCommunity.id);

      await signInAsUser(userAClient, userA);
      const cycleConversation = await createTestConversation(
        userAClient,
        cycleUser.id,
      );

      const conversationTopic = messagesChannelForConversation(
        cycleConversation.id,
      );

      await signInAsUser(cycleUserClient, cycleUser);

      // Subscribe and unsubscribe quickly
      const channel1 = cycleUserClient
        .channel(`${conversationTopic}-1`, {
          config: { private: true },
        })
        .subscribe();

      await new Promise((resolve) => setTimeout(resolve, 500));
      await channel1.unsubscribe();

      // Now create stable subscription
      const receivedByCycleUser: RealtimeBroadcastMessage[] = [];
      const stableChannel = cycleUserClient
        .channel(conversationTopic, {
          config: { private: true },
        })
        .on(
          'broadcast',
          { event: '*' },
          (message: RealtimeBroadcastMessage) => {
            receivedByCycleUser.push(message);
          },
        )
        .subscribe();

      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Send message
      await signInAsUser(userAClient, userA);
      await sendMessage(userAClient, userA.id, {
        conversationId: cycleConversation.id,
        content: `${TEST_PREFIX} after cycle`,
      });

      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Should receive exactly 1 message
      expect(receivedByCycleUser).toHaveLength(1);

      await stableChannel?.unsubscribe();
    });
  });
});
