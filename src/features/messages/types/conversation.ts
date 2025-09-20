import { Database } from '@/shared/types/database';

export type ConversationType = Database['public']['Enums']['conversation_type'];

export interface Conversation {
  id: string;
  conversationType: ConversationType;
  lastMessageAt?: Date;
  lastMessagePreview?: string;
  lastMessageSenderId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DirectConversation extends Conversation {
  conversationType: 'direct';
  participants: string[];
}

export interface CommunityChat extends Conversation {
  conversationType: 'community';
  communityId: string;
}

export interface StartConversationInput {
  otherUserId: string;
}
