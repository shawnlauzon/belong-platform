export interface ShoutoutFilter {
  communityId?: string;
  communityIds?: string[];
  sentBy?: string;
  receivedBy?: string;
  resourceId?: string;
  page?: number;
  pageSize?: number;
}
