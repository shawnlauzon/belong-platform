import type { Database } from '@/shared/types/database';
import type { PublicProfileSummaryRow } from '@/features/users/types/publicProfileRow';

export const SELECT_COMMENTS_JOIN_AUTHOR = `*, public_profiles!comments_author_id_fkey(id, first_name, avatar_url)`;

export type CommentRow = Database['public']['Tables']['comments']['Row'];
export type CommentInsertDbData = Database['public']['Tables']['comments']['Insert'];
export type CommentUpdateDbData = Database['public']['Tables']['comments']['Update'];

export type CommentRowJoinAuthor = CommentRow & {
  public_profiles: PublicProfileSummaryRow;
};

export type CommentWithRepliesRow = CommentRowJoinAuthor & {
  replies?: CommentRowJoinAuthor[];
};