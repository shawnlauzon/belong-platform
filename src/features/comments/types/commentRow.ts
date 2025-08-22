import type { Database } from '@/shared/types/database';

export const SELECT_COMMENTS_JOIN_AUTHOR = `*, profiles!comments_author_id_fkey(*)`;

export type CommentRow = Database['public']['Tables']['comments']['Row'];
export type CommentInsertDbData = Database['public']['Tables']['comments']['Insert'];
export type CommentUpdateDbData = Database['public']['Tables']['comments']['Update'];

export type CommentRowJoinAuthor = CommentRow & {
  profiles: Database['public']['Tables']['profiles']['Row'];
};

export type CommentWithRepliesRow = CommentRowJoinAuthor & {
  replies?: CommentRowJoinAuthor[];
};