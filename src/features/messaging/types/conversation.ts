import { Message } from './message';

export interface Conversation {
  id: string;
  lastMessage: Message | null;
  initiatorId: string;
  participants: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CommunityChat {
  communityId: string;
  lastMessage: Message | null;
}

export interface StartConversationInput {
  otherUserId: string;
}
