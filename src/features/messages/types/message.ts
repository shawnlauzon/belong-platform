export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  isEdited: boolean;
  isDeleted: boolean;
  encryptionVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SendMessageInput {
  conversationId: string;
  content: string;
}

export interface EditMessageInput {
  messageId: string;
  content: string;
}
