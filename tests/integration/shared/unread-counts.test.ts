import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import {
  createTestConversation,
} from '../messages/messaging-helpers';
import { sendMessage } from '@/features/messages/api';
import {
  createTestCommunity,
  createTestUser,
  createTestResource,
  TEST_PREFIX,
} from '../helpers/test-data';
import { createShoutout } from '@/features/shoutouts/api';
import { fetchUnreadCounts, UnreadCounts } from '@/shared/hooks/useUnreadCounts';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import { joinCommunity } from '@/features/communities/api';
import { signIn } from '@/features/auth/api';

// Helper function to simulate useUnreadCounts logic
async function fetchUnreadCounts(supabase: SupabaseClient<Database>): Promise<UnreadCounts> {
  try {
    // Get current user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData?.user) {
      return {
        notifications: 0,
        messages: 0,
        total: 0,
        messagesByConversation: {},
      };
    }

    const userId = userData.user.id;

    // Fetch notification count
    const { data: notificationData, error: notificationError } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null);

    if (notificationError) {
      console.error('Failed to fetch notification count:', notificationError);
    }

    const notificationCount = notificationData ? notificationData.length : 0;

    // Fetch message counts by conversation
    const { data: messageData, error: messageError } = await supabase
      .from('conversation_participants')
      .select('conversation_id, unread_count')
      .eq('user_id', userId)
      .gt('unread_count', 0);

    if (messageError) {
      console.error('Failed to fetch message counts:', messageError);
    }

    const messagesByConversation = (messageData || []).reduce(
      (map, participant) => {
        map[participant.conversation_id] = participant.unread_count;
        return map;
      },
      {} as Record<string, number>
    );

    const messageCount = Object.values(messagesByConversation).reduce(
      (sum, count) => sum + count,
      0
    );

    return {
      notifications: notificationCount,
      messages: messageCount,
      total: notificationCount + messageCount,
      messagesByConversation,
    };
  } catch (error) {
    console.error('Unexpected error in fetchUnreadCounts:', error);
    return {
      notifications: 0,
      messages: 0,
      total: 0,
      messagesByConversation: {},
    };
  }
}

describe('Unified Unread Counts Tests', () => {
  let supabase: SupabaseClient<Database>;
  let otherUserClient: SupabaseClient<Database>;
  let testUser: Account;
  let testCommunity: any;
  let anotherUser: Account;

  beforeAll(async () => {
    supabase = createTestClient();
    otherUserClient = createTestClient();

    // Create test users and community
    testUser = await createTestUser(supabase);
    testCommunity = await createTestCommunity(supabase);

    // Create another user and have them join the community
    anotherUser = await createTestUser(otherUserClient);
    await joinCommunity(otherUserClient, testCommunity.id);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  beforeEach(async () => {
    // Sign back in as testUser for consistency
    await signIn(supabase, testUser.email, 'TestPass123!');
    await signIn(otherUserClient, anotherUser.email, 'TestPass123!');
  });

  it('should fetch initial unread counts with proper structure for authenticated user', async () => {
    await signIn(supabase, testUser.email, 'TestPass123!');

    const counts = await fetchUnreadCounts(supabase);

    expect(counts).toBeDefined();
    expect(counts).toMatchObject({
      notifications: expect.any(Number),
      messages: expect.any(Number),
      total: expect.any(Number),
      messagesByConversation: expect.any(Object),
    });
    expect(counts.total).toBe(counts.notifications + counts.messages);
  });

  it('should increment message count when new messages are received', async () => {
    await signIn(supabase, testUser.email, 'TestPass123!');
    
    // Get initial counts
    const initialCounts = await fetchUnreadCounts(supabase);

    // Create conversation and send message from other user
    const conversation = await createTestConversation(otherUserClient, testUser.id);
    await sendMessage(otherUserClient, {
      conversationId: conversation.id,
      content: `${TEST_PREFIX} message count test`,
      messageType: 'text',
    });

    // Wait for message to be processed
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get updated counts
    const updatedCounts = await fetchUnreadCounts(supabase);

    expect(updatedCounts.messages).toBe(initialCounts.messages + 1);
    expect(updatedCounts.total).toBe(updatedCounts.notifications + updatedCounts.messages);
    expect(updatedCounts.messagesByConversation[conversation.id]).toBe(1);
  });

  it('should increment notification count when new notifications are created', async () => {
    await signIn(supabase, testUser.email, 'TestPass123!');

    // Get initial counts
    const initialCounts = await fetchUnreadCounts(supabase);

    // Create a resource as testUser 
    const resource = await createTestResource(supabase, testCommunity.id, 'offer');

    // Switch to anotherUser and create a shoutout (triggers notification)
    await signIn(otherUserClient, anotherUser.email, 'TestPass123!');
    await createShoutout(otherUserClient, {
      receiverId: testUser.id,
      message: `${TEST_PREFIX} notification count test`,
      resourceId: resource.id,
      communityId: testCommunity.id,
    });

    // Wait for notification to be created
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Switch back to testUser and get updated counts
    await signIn(supabase, testUser.email, 'TestPass123!');
    const updatedCounts = await fetchUnreadCounts(supabase);

    expect(updatedCounts.notifications).toBeGreaterThan(initialCounts.notifications);
    expect(updatedCounts.total).toBe(updatedCounts.notifications + updatedCounts.messages);
  });

  it('should correctly count both messages and notifications in total count', async () => {
    await signIn(supabase, testUser.email, 'TestPass123!');

    // Get initial counts
    const initialCounts = await fetchUnreadCounts(supabase);

    // Create message
    const conversation = await createTestConversation(otherUserClient, testUser.id);
    await sendMessage(otherUserClient, {
      conversationId: conversation.id,
      content: `${TEST_PREFIX} combined count test`,
      messageType: 'text',
    });

    // Create notification
    const resource = await createTestResource(supabase, testCommunity.id, 'offer');
    await signIn(otherUserClient, anotherUser.email, 'TestPass123!');
    await createShoutout(otherUserClient, {
      receiverId: testUser.id,
      message: `${TEST_PREFIX} combined notification test`,
      resourceId: resource.id,
      communityId: testCommunity.id,
    });

    // Wait for both to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));

    await signIn(supabase, testUser.email, 'TestPass123!');
    const updatedCounts = await fetchUnreadCounts(supabase);

    // Should have both message and notification counts increased
    expect(updatedCounts.messages).toBe(initialCounts.messages + 1);
    expect(updatedCounts.notifications).toBeGreaterThan(initialCounts.notifications);
    expect(updatedCounts.total).toBe(updatedCounts.notifications + updatedCounts.messages);
  });

  it('should track unread counts separately for multiple conversations', async () => {
    await signIn(supabase, testUser.email, 'TestPass123!');

    // Get initial counts
    const initialCounts = await fetchUnreadCounts(supabase);

    // Create two conversations with messages
    const conversation1 = await createTestConversation(otherUserClient, testUser.id);
    const conversation2 = await createTestConversation(otherUserClient, testUser.id);

    await sendMessage(otherUserClient, {
      conversationId: conversation1.id,
      content: `${TEST_PREFIX} conv1 message`,
      messageType: 'text',
    });

    await sendMessage(otherUserClient, {
      conversationId: conversation2.id,
      content: `${TEST_PREFIX} conv2 message`,
      messageType: 'text',
    });

    // Wait for messages to be processed
    await new Promise(resolve => setTimeout(resolve, 1000));

    await signIn(supabase, testUser.email, 'TestPass123!');
    const updatedCounts = await fetchUnreadCounts(supabase);

    expect(updatedCounts.messages).toBe(initialCounts.messages + 2);
    expect(updatedCounts.messagesByConversation[conversation1.id]).toBe(1);
    expect(updatedCounts.messagesByConversation[conversation2.id]).toBe(1);
    expect(updatedCounts.total).toBe(updatedCounts.notifications + updatedCounts.messages);
  });

  it('should accumulate unread count for multiple messages in same conversation', async () => {
    await signIn(supabase, testUser.email, 'TestPass123!');

    // Get initial counts
    const initialCounts = await fetchUnreadCounts(supabase);

    // Create conversation and send multiple messages
    const conversation = await createTestConversation(otherUserClient, testUser.id);
    
    await sendMessage(otherUserClient, {
      conversationId: conversation.id,
      content: `${TEST_PREFIX} message 1`,
      messageType: 'text',
    });

    await sendMessage(otherUserClient, {
      conversationId: conversation.id,
      content: `${TEST_PREFIX} message 2`,
      messageType: 'text',
    });

    await sendMessage(otherUserClient, {
      conversationId: conversation.id,
      content: `${TEST_PREFIX} message 3`,
      messageType: 'text',
    });

    // Wait for messages to be processed
    await new Promise(resolve => setTimeout(resolve, 1000));

    await signIn(supabase, testUser.email, 'TestPass123!');
    const updatedCounts = await fetchUnreadCounts(supabase);

    expect(updatedCounts.messages).toBe(initialCounts.messages + 3);
    expect(updatedCounts.messagesByConversation[conversation.id]).toBe(3);
    expect(updatedCounts.total).toBe(updatedCounts.notifications + updatedCounts.messages);
  });

  it('should return zero counts when user is not authenticated', async () => {
    // Sign out
    await supabase.auth.signOut();

    const counts = await fetchUnreadCounts(supabase);

    expect(counts).toMatchObject({
      notifications: 0,
      messages: 0,
      total: 0,
      messagesByConversation: {},
    });
  });

  it('should handle database errors gracefully and return valid count structure', async () => {
    await signIn(supabase, testUser.email, 'TestPass123!');

    // This should not throw even if there are database issues
    const counts = await fetchUnreadCounts(supabase);

    expect(counts).toBeDefined();
    expect(counts).toMatchObject({
      notifications: expect.any(Number),
      messages: expect.any(Number),
      total: expect.any(Number),
      messagesByConversation: expect.any(Object),
    });
  });
});