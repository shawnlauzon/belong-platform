import { Database } from '@/shared/types/database';

export type ConversationType = Database['public']['Enums']['conversation_type'];

export interface Conversation {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt?: Date;
  lastMessagePreview?: string;
  lastMessageSenderId?: string;
  conversationType: ConversationType;
  participants: string[];
  communityId?: string;
}

export interface StartConversationInput {
  otherUserId: string;
}

export interface ConversationListFilters {
  conversationType?: ConversationType;
  communityId?: string | string[];
}
