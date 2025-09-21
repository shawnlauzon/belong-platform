export const messagesChannelForConversation = (conversationId: string) =>
  `conversation:${conversationId}:messages`;

export const messagesChannelForCommunity = (communityId: string) =>
  `community:${communityId}:messages`;

export const notificationChannelForUser = (userId: string) =>
  `user:${userId}:notifications`;
