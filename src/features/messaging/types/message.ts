export interface Message {
  id: string;
  conversationId?: string | null;
  communityId?: string | null;
  senderId: string;
  content: string;
  isEdited: boolean;
  isDeleted: boolean;
  encryptionVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RealtimeBroadcastMessage {
  type: 'broadcast';
  event: string;
  payload: MessagePayload;
}

export interface MessagePayload {
  sender_id: string;
  message_id: string;
  content: string;
  sent_at: string;
}

export interface SendMessageInput {
  conversationId?: string;
  communityId?: string;
  content: string;
}

export interface EditMessageInput {
  messageId: string;
  content: string;
}

export interface BlockUserInput {
  blockedUserId: string;
}

export interface ReportMessageInput {
  messageId: string;
  reason: MessageReportReason;
  details?: string;
}

export interface MessageReport {
  id: string;
  messageId: string;
  reporterId: string;
  reason: MessageReportReason;
  details?: string;
  status: MessageReportStatus;
  createdAt: Date;
  reviewedAt?: Date | null;
  reviewedBy?: string | null;
}

export type MessageReportReason =
  | 'spam'
  | 'harassment'
  | 'inappropriate'
  | 'other';

export type MessageReportStatus = 'pending' | 'approved' | 'rejected';

export interface DeleteMessageInput {
  messageId: string;
}

export interface UnblockUserInput {
  blockedUserId: string;
}
