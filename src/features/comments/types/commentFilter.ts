export type CommentFilter = {
  resourceId?: string;
  shoutoutId?: string;
  parentId?: string | null;
  includeDeleted?: boolean;
};