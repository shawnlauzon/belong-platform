import { createMockUser, createMockDbConversation, createMockDbDirectMessage } from '../../test-utils/mocks';

/**
 * Creates a conversation between two specific users
 */
export function createConversationBetweenUsers(user1Id: string, user2Id: string) {
  return createMockDbConversation({
    participant_1_id: user1Id,
    participant_2_id: user2Id,
  });
}

/**
 * Creates a message from one user to another
 */
export function createMessageBetweenUsers(
  conversationId: string,
  fromUserId: string,
  toUserId: string,
  content?: string
) {
  return createMockDbDirectMessage({
    conversation_id: conversationId,
    from_user_id: fromUserId,
    to_user_id: toUserId,
    content: content || 'Test message',
  });
}

/**
 * Creates two mock users that can be used in messaging tests
 */
export function createMockUserPair() {
  const user1 = createMockUser({ firstName: 'Alice' });
  const user2 = createMockUser({ firstName: 'Bob' });
  return { user1, user2 };
}