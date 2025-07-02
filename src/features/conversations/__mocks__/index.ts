import { faker } from '@faker-js/faker';
import {
  Conversation,
  ConversationData,
  ConversationInfo,
  Message,
  MessageData,
  MessageInfo,
} from '../types';
import { createMockUser } from '../../users/__mocks__';
import { ConversationRow, DirectMessageRow } from '../types/database';

/**
 * Creates a mock domain Message object
 */
export function createMockMessage(overrides: Partial<Message> = {}): Message {
  const now = new Date();
  const fromUser = createMockUser();
  const toUser = createMockUser();

  return {
    id: faker.string.uuid(),
    conversationId: faker.string.uuid(),
    content: faker.lorem.paragraph(),
    readAt: faker.datatype.boolean() ? faker.date.recent() : undefined,
    createdAt: now,
    updatedAt: now,
    fromUser,
    toUser,
    ...overrides,
  };
}

/**
 * Creates a mock MessageInfo object (lightweight for lists)
 */
export function createMockMessageInfo(
  overrides: Partial<MessageInfo> = {}
): MessageInfo {
  const now = new Date();

  return {
    id: faker.string.uuid(),
    conversationId: faker.string.uuid(),
    fromUserId: faker.string.uuid(),
    toUserId: faker.string.uuid(),
    content: faker.lorem.paragraph(),
    readAt: faker.datatype.boolean() ? faker.date.recent() : undefined,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Creates a mock domain Conversation object
 */
export function createMockConversation(
  overrides: Partial<Conversation> = {}
): Conversation {
  const now = new Date();
  const participant1 = createMockUser();
  const participant2 = createMockUser();
  const message = createMockMessage();

  return {
    id: faker.string.uuid(),
    participant1Id: participant1.id,
    participant2Id: participant2.id,
    lastActivityAt: faker.date.recent(),
    lastMessageId: message.id,
    createdAt: now,
    updatedAt: now,
    participants: [participant1, participant2],
    lastMessage: message,
    ...overrides,
  };
}

/**
 * Creates a mock ConversationInfo object (lightweight for lists)
 */
export function createMockConversationInfo(
  overrides: Partial<ConversationInfo> = {}
): ConversationInfo {
  const now = new Date();

  return {
    id: faker.string.uuid(),
    participant1Id: faker.string.uuid(),
    participant2Id: faker.string.uuid(),
    lastActivityAt: faker.date.recent(),
    lastMessageId: faker.string.uuid(),
    createdAt: now,
    updatedAt: now,
    lastMessagePreview: faker.lorem.sentence(),
    unreadCount: faker.number.int({ min: 0, max: 10 }),
    ...overrides,
  };
}

export function createMockMessageData(
  overrides: Partial<MessageData> = {}
): MessageData {
  return {
    conversationId: faker.string.uuid(),
    content: faker.lorem.paragraph(),
    ...overrides,
  };
}

export function createMockConversationData(
  overrides: Partial<ConversationData> = {}
): ConversationData {
  return {
    participant1Id: faker.string.uuid(),
    participant2Id: faker.string.uuid(),
    ...overrides,
  };
}

/**
 * Creates a mock database Conversation row
 */
export function createMockDbConversation(
  overrides: Partial<ConversationRow> = {}
): ConversationRow {
  const now = new Date().toISOString();

  return {
    id: faker.string.uuid(),
    participant_1_id: faker.string.uuid(),
    participant_2_id: faker.string.uuid(),
    last_activity_at: faker.date.recent().toISOString(),
    last_message_id: faker.datatype.boolean() ? faker.string.uuid() : null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

/**
 * Creates a mock database DirectMessage row
 */
export function createMockDbDirectMessage(
  overrides: Partial<DirectMessageRow> = {}
): DirectMessageRow {
  const now = new Date().toISOString();

  return {
    id: faker.string.uuid(),
    conversation_id: faker.string.uuid(),
    from_user_id: faker.string.uuid(),
    to_user_id: faker.string.uuid(),
    content: faker.lorem.paragraph(),
    read_at: faker.datatype.boolean()
      ? faker.date.recent().toISOString()
      : null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}
