import { User } from '../../users';

// Messaging Types
export interface MessageData {
  conversationId: string;
  fromUserId: string;
  toUserId: string;
  content: string;
}

export interface Message {
  id: string;
  conversationId: string;
  content: string;
  readAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Assembled references
  fromUser: User;
  toUser: User;
}

export interface MessageInfo extends Omit<Message, 'fromUser' | 'toUser'> {
  fromUserId: string;
  toUserId: string;
}

export interface ConversationData {
  participant1Id: string;
  participant2Id: string;
}

export interface Conversation extends ConversationData {
  id: string;
  lastActivityAt: Date;
  lastMessageId?: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Assembled references
  participants?: [User, User];
  lastMessage?: Message;
}

export interface ConversationInfo
  extends Omit<Conversation, 'participants' | 'lastMessage'> {
  // Lightweight version for lists - contains IDs instead of full objects
  lastMessagePreview?: string;
  unreadCount?: number;
}

export interface ConversationFilter {
  userId?: string;
  page?: number;
  pageSize?: number;
  hasUnread?: boolean;
  includeDeleted?: boolean;
}

export interface MessageFilter {
  conversationId: string;
  page?: number;
  pageSize?: number;
  since?: Date;
  includeDeleted?: boolean;
}

// Notification Types
export interface NotificationData {
  userId: string;
  type: 'new_message' | 'message_read';
  title: string;
  body?: string;
  data: {
    conversationId?: string;
    messageId?: string;
    senderId?: string;
  };
}

export interface Notification extends NotificationData {
  id: string;
  readAt?: Date;
  createdAt: Date;
  // Assembled references
  sender?: User;
  conversation?: Conversation;
  message?: Message;
}

export interface NotificationInfo
  extends Omit<Notification, 'sender' | 'conversation' | 'message'> {
  // Lightweight version for lists - contains IDs instead of full objects
  senderId?: string;
  conversationId?: string;
  messageId?: string;
}

export interface NotificationFilter {
  userId?: string;
  type?: 'new_message' | 'message_read';
  isRead?: boolean;
  page?: number;
  pageSize?: number;
  since?: Date;
}
