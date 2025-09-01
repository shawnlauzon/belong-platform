import type { Comment } from '../types/comment';
import type { CommentRowJoinAuthor, CommentWithRepliesRow } from '../types/commentRow';
import { toUserSummary } from '@/features/users/transformers/userTransformer';

export function toDomainComment(row: CommentRowJoinAuthor): Comment {
  return {
    id: row.id,
    content: row.content,
    authorId: row.author_id,
    author: toUserSummary(row.public_profiles),
    isEdited: row.is_edited ?? false,
    isDeleted: row.is_deleted ?? false,
    parentId: row.parent_id ?? undefined,
    resourceId: row.resource_id ?? undefined,
    shoutoutId: row.shoutout_id ?? undefined,
    createdAt: new Date(row.created_at ?? ''),
    updatedAt: new Date(row.updated_at ?? ''),
  };
}

export function toDomainCommentWithReplies(row: CommentWithRepliesRow): Comment {
  const comment = toDomainComment(row);
  
  if (row.replies && row.replies.length > 0) {
    comment.replies = row.replies.map(reply => toDomainComment(reply));
  }
  
  return comment;
}

export function organizeCommentsIntoThreads(comments: CommentRowJoinAuthor[]): Comment[] {
  const commentMap = new Map<string, Comment>();
  const topLevelComments: Comment[] = [];
  
  // First pass: convert all comments to domain objects
  comments.forEach(row => {
    const comment = toDomainComment(row);
    commentMap.set(comment.id, comment);
  });
  
  // Second pass: organize into threads (max 2 levels)
  comments.forEach(row => {
    const comment = commentMap.get(row.id)!;
    
    if (!row.parent_id) {
      // Top-level comment
      topLevelComments.push(comment);
    } else {
      // Reply to another comment
      const parent = commentMap.get(row.parent_id);
      if (parent) {
        if (!parent.replies) {
          parent.replies = [];
        }
        parent.replies.push(comment);
      }
    }
  });
  
  // Sort comments and replies by creation date
  topLevelComments.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  topLevelComments.forEach(comment => {
    if (comment.replies) {
      comment.replies.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }
  });
  
  return topLevelComments;
}