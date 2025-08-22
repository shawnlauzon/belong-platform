// Types
export type { Comment, PartialComment, CommentInput, CommentFilter } from './types';

// API
export { 
  fetchComments,
  fetchCommentById,
  createComment,
  updateComment,
  deleteComment,
} from './api';

// Hooks
export {
  useComments,
  useComment,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
} from './hooks';

// Queries
export { commentKeys } from './queries';