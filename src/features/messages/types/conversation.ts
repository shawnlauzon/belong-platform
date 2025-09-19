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
  participants: string[];
}

export interface CommunityChat extends Conversation {
  communityId: string;
}

export interface StartConversationInput {
  otherUserId: string;
}

export interface CommunityConversation {
  id: string;
  conversationType: 'community';
  communityId: string;
  lastMessageAt?: Date;
  lastMessagePreview?: string;
  lastMessageSenderId?: string;
  createdAt: Date;
  updatedAt: Date;
  unreadCount?: number;
  lastReadAt?: Date;
  participantCount?: number;
}
