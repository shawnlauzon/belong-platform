import { Database } from '../../../shared/types/database';
import { User } from '../../users/types';

export type ConversationParticipantRow = Database['public']['Tables']['conversation_participants']['Row'];

export type ConversationType = 'direct' | 'community';

export interface Conversation {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date | null;
  lastMessagePreview: string | null;
  lastMessageSenderId: string | null;
  otherParticipant: User;
  unreadCount: number;
  lastReadAt: Date | null;
  conversationType: ConversationType;
  communityId?: string;
}

export interface CommunityConversation {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date | null;
  lastMessagePreview: string | null;
  lastMessageSenderId: string | null;
  communityId: string;
  conversationType: 'community';
  unreadCount: number;
  lastReadAt: Date | null;
  participantCount: number;
}

export interface ConversationParticipant {
  conversationId: string;
  userId: string;
  joinedAt: Date;
  lastReadAt: Date | null;
  unreadCount: number;
  user?: User;
}

export interface StartConversationInput {
  otherUserId: string;
}

export interface ConversationListFilters {
  search?: string;
  hasUnread?: boolean;
}

export interface ConversationListResponse {
  conversations: Conversation[];
  hasMore: boolean;
  cursor?: string;
}