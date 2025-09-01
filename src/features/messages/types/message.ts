import { Database } from '../../../shared/types/database';
import { UserSummary } from '../../users/types';

export type MessageStatusRow = Database['public']['Tables']['message_status']['Row'];
export type MessageReportRow = Database['public']['Tables']['message_reports']['Row'];
export type BlockedUserRow = Database['public']['Tables']['blocked_users']['Row'];

export type MessageType = 'text' | 'system';
export type MessageReportReason = 'spam' | 'harassment' | 'inappropriate' | 'other';
export type MessageReportStatus = 'pending' | 'reviewed' | 'resolved';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  messageType: MessageType;
  isEdited: boolean;
  isDeleted: boolean;
  encryptionVersion: number;
  createdAt: Date;
  updatedAt: Date;
  sender: UserSummary;
  status?: MessageStatus;
  isMine: boolean;
}

export interface MessageStatus {
  messageId: string;
  userId: string;
  deliveredAt: Date;
  readAt: Date | null;
}

export interface SendMessageInput {
  conversationId: string;
  content: string;
  messageType?: MessageType;
}

export interface EditMessageInput {
  messageId: string;
  content: string;
}

export interface DeleteMessageInput {
  messageId: string;
}

export interface MessageListFilters {
  conversationId: string;
  limit?: number;
  cursor?: string;
}

export interface MessageListResponse {
  messages: Message[];
  hasMore: boolean;
  cursor?: string;
}

export interface MessageReport {
  id: string;
  messageId: string;
  reporterId: string;
  reason: MessageReportReason;
  details: string | null;
  createdAt: Date;
  status: MessageReportStatus;
  reviewedAt: Date | null;
  reviewedBy: string | null;
}

export interface ReportMessageInput {
  messageId: string;
  reason: MessageReportReason;
  details?: string;
}

export interface BlockedUser {
  blockerId: string;
  blockedId: string;
  blockedAt: Date;
  blockedUser?: UserSummary;
}

export interface BlockUserInput {
  userId: string;
}

export interface UnblockUserInput {
  userId: string;
}

export interface TypingIndicator {
  userId: string;
  isTyping: boolean;
  timestamp: number;
}