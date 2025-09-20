import { faker } from '@faker-js/faker';
import {
  Message,
  Conversation,
  SendMessageInput,
  MessageReport,
  CommunityChat,
} from '../types';
import {
  MessageWithSender,
  ConversationWithParticipants,
} from '../types/messageRow';
import { createFakeUser } from '../../users/__fakes__';
import type { Database } from '../../../shared/types/database';

/**
 * Creates a fake Message domain object
 */
export function createFakeMessage(overrides: Partial<Message> = {}): Message {
  const now = faker.date.recent();
  const sender = createFakeUser();

  return {
    id: faker.string.uuid(),
    conversationId: faker.string.uuid(),
    senderId: sender.id,
    content: faker.lorem.sentence(),
    isEdited: faker.datatype.boolean(),
    isDeleted: false,
    encryptionVersion: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Creates a fake Conversation domain object
 */
export function createFakeConversation(
  overrides: Partial<Conversation> = {},
): Conversation {
  const now = faker.date.recent();

  return {
    id: faker.string.uuid(),
    createdAt: now,
    updatedAt: now,
    lastMessage: createFakeMessage(),
    conversationType: 'direct',
    ...overrides,
  };
}

/**
 * Creates a fake CommunityChat domain object
 */
export function createFakeCommunityChat(
  overrides: Partial<CommunityChat> = {},
): CommunityChat {
  const now = faker.date.recent();

  return {
    id: faker.string.uuid(),
    createdAt: now,
    updatedAt: now,
    lastMessage: createFakeMessage(),
    communityId: faker.string.uuid(),
    conversationType: 'community',
    ...overrides,
  };
}

/**
 * Creates a fake SendMessageInput
 */
export function createFakeSendMessageInput(
  overrides: Partial<SendMessageInput> = {},
): SendMessageInput {
  return {
    conversationId: faker.string.uuid(),
    content: faker.lorem.sentence(),
    ...overrides,
  };
}

/**
 * Creates a fake MessageReport domain object
 */
export function createFakeMessageReport(
  overrides: Partial<MessageReport> = {},
): MessageReport {
  const now = faker.date.recent();

  return {
    id: faker.string.uuid(),
    messageId: faker.string.uuid(),
    reporterId: faker.string.uuid(),
    reason: faker.helpers.arrayElement([
      'spam',
      'harassment',
      'inappropriate',
      'other',
    ]),
    details: faker.lorem.paragraph(),
    createdAt: now,
    status: 'pending',
    reviewedAt: undefined,
    reviewedBy: undefined,
    ...overrides,
  };
}

/**
 * Creates a fake MessageWithSender row (database format)
 */
export function createFakeMessageWithSender(
  overrides: Partial<MessageWithSender> = {},
): MessageWithSender {
  const now = faker.date.recent().toISOString();
  const senderId = faker.string.uuid();

  return {
    id: faker.string.uuid(),
    conversation_id: faker.string.uuid(),
    sender_id: senderId,
    content: faker.lorem.sentence(),
    is_edited: false,
    is_deleted: false,
    encryption_version: 1,
    created_at: now,
    updated_at: now,
    sender: {
      id: senderId,
      created_at: now,
      updated_at: now,
      email: faker.internet.email(),
      user_metadata: {
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        full_name: faker.person.fullName(),
        avatar_url: faker.image.avatar(),
        bio: faker.lorem.paragraph(),
        location: {
          lat: faker.location.latitude(),
          lng: faker.location.longitude(),
        },
      },
    },
    ...overrides,
  } as MessageWithSender;
}

/**
 * Creates a fake conversation database row
 */
export function createFakeConversationRow(
  overrides: Partial<Database['public']['Tables']['conversations']['Row']> = {},
): Database['public']['Tables']['conversations']['Row'] {
  const now = faker.date.recent().toISOString();

  return {
    id: faker.string.uuid(),
    created_at: now,
    updated_at: now,
    community_id: null,
    conversation_type: 'direct',
    ...overrides,
  };
}


/**
 * Creates a fake basic message row (minimal fields only)
 */
export function createFakeMessageBasic(
  overrides: Partial<{
    id: string;
    sender_id: string;
    content: string;
    created_at: string;
    updated_at: string;
  }> = {},
) {
  const now = faker.date.recent().toISOString();

  return {
    id: faker.string.uuid(),
    sender_id: faker.string.uuid(),
    content: faker.lorem.sentence(),
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

/**
 * Creates a fake conversation participant row
 */
export function createFakeConversationParticipantRow(
  overrides: Partial<
    Database['public']['Tables']['conversation_participants']['Row']
  > = {},
): Database['public']['Tables']['conversation_participants']['Row'] {
  const now = faker.date.recent().toISOString();

  return {
    conversation_id: faker.string.uuid(),
    user_id: faker.string.uuid(),
    joined_at: now,
    read_at: null,
    ...overrides,
  };
}

/**
 * Creates a fake ConversationWithParticipants row (database format with joined data)
 */
export function createFakeConversationWithParticipants(
  currentUserId: string,
  otherUserId?: string,
  overrides: Partial<ConversationWithParticipants> = {},
): ConversationWithParticipants {
  const now = faker.date.recent().toISOString();
  const otherParticipantId = otherUserId || faker.string.uuid();

  return {
    id: faker.string.uuid(),
    created_at: now,
    updated_at: now,
    community_id: null,
    conversation_type: 'direct',
    conversation_participants: [
      {
        user_id: currentUserId,
        unread_count: faker.number.int({ min: 0, max: 5 }),
        last_read_at: faker.date.recent().toISOString(),
        public_profiles: {
          id: currentUserId,
          first_name: faker.person.firstName(),
          last_name: faker.person.lastName(),
          full_name: faker.person.fullName(),
          avatar_url: faker.image.avatar(),
        },
      },
      {
        user_id: otherParticipantId,
        unread_count: faker.number.int({ min: 0, max: 5 }),
        last_read_at: faker.date.recent().toISOString(),
        public_profiles: {
          id: otherParticipantId,
          first_name: faker.person.firstName(),
          last_name: faker.person.lastName(),
          full_name: faker.person.fullName(),
          avatar_url: faker.image.avatar(),
        },
      },
    ],
    ...overrides,
  };
}
