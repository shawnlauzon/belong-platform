// Be aware that only one of these is allowed to be set
export interface ShoutoutFilter {
  communityId?: string | string[];
  resourceId?: string;
  senderId?: string;
  receiverId?: string;
}
