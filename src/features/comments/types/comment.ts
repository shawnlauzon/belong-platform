import { IsPersisted } from '@/shared';
import { UserSummary } from '@/features/users';

export type Comment = IsPersisted<CommentInput> & {
  authorId: string;
  author: UserSummary;
  isEdited: boolean;
  isDeleted: boolean;
  replies?: Comment[];
};

export type PartialComment = IsPersisted<CommentSummary>;

export type CommentInput = {
  content: string;
  parentId?: string;
  resourceId?: string;
  shoutoutId?: string;
};

type CommentSummary = {
  content: string;
  authorId: string;
  author: UserSummary;
  isEdited: boolean;
  isDeleted: boolean;
  parentId?: string;
  resourceId?: string;
  shoutoutId?: string;
};