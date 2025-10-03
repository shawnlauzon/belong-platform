# Comments

Threading comment system for resources and shoutouts.

## Purpose

The comments feature provides:
- Commenting on resources and shoutouts
- Threaded replies (parent-child relationships)
- Author attribution
- Edit and delete functionality
- Soft deletion (preserves structure)

## Key Entities

### Comment

Individual comment on a resource or shoutout.

**Key Fields:**
- `id` - Comment ID
- `content` - Comment text
- `authorId` - User who wrote the comment
- `author` - UserSummary with author details
- `parentId` - Parent comment ID (null for top-level)
- `resourceId` - Resource being commented on (if applicable)
- `shoutoutId` - Shoutout being commented on (if applicable)
- `isEdited` - Whether comment has been edited
- `isDeleted` - Whether comment is soft-deleted
- `replies` - Array of child comments (optional)
- `createdAt`, `updatedAt` - Timestamps

**Notes:**
- Either `resourceId` OR `shoutoutId` is set, never both
- Soft-deleted comments show placeholder text
- Replies are loaded recursively for threading

## Core Concepts

### Threading

Comments support parent-child relationships:
- Top-level comments have `parentId = null`
- Replies reference parent via `parentId`
- Recursive structure for nested conversations
- Replies included in parent comment's `replies` array

### Commenting Targets

Comments can be attached to:
- **Resources** - Comments on offers, requests, events
- **Shoutouts** - Comments on appreciation posts

### Soft Deletion

Deleted comments are preserved:
- `isDeleted` flag set to true
- Content replaced with placeholder
- Structure maintained for threading
- Author information retained

### Edit History

Edited comments are tracked:
- `isEdited` flag indicates modifications
- Content updated in place
- No edit history stored (current version only)

## API Reference

### Hooks
- `useComments(filter)` - Query comments for resource or shoutout
- `useComment(id)` - Get single comment by ID
- `useCreateComment()` - Create new comment
- `useUpdateComment()` - Update comment content
- `useDeleteComment()` - Soft delete comment

### Key Functions
- `fetchComments(supabase, filter)` - Fetch comments with filters
- `fetchCommentById(supabase, id)` - Fetch single comment
- `createComment(supabase, input)` - Create comment
- `updateComment(supabase, id, content)` - Update comment
- `deleteComment(supabase, id)` - Soft delete comment

## Important Patterns

### Fetching Comments

```typescript
// Get all comments for a resource
const { data: comments } = useComments({
  resourceId: 'resource-id'
});

// Get all comments for a shoutout
const { data: comments } = useComments({
  shoutoutId: 'shoutout-id'
});
```

### Creating Comments

```typescript
const createComment = useCreateComment();

// Top-level comment on resource
await createComment.mutateAsync({
  resourceId: 'resource-id',
  content: 'Great resource!'
});

// Reply to another comment
await createComment.mutateAsync({
  resourceId: 'resource-id',
  parentId: 'parent-comment-id',
  content: 'I agree!'
});
```

### Updating Comments

```typescript
const updateComment = useUpdateComment();

await updateComment.mutateAsync({
  id: 'comment-id',
  content: 'Updated content'
});
```

### Deleting Comments

```typescript
const deleteComment = useDeleteComment();

await deleteComment.mutateAsync('comment-id');
// Comment is soft-deleted, structure preserved
```

### Threading Display

```typescript
function CommentThread({ comment }: { comment: Comment }) {
  return (
    <div>
      <CommentContent comment={comment} />
      {comment.replies?.map(reply => (
        <div key={reply.id} style={{ marginLeft: '2rem' }}>
          <CommentThread comment={reply} />
        </div>
      ))}
    </div>
  );
}
```

### Handling Deleted Comments

```typescript
function CommentContent({ comment }: { comment: Comment }) {
  if (comment.isDeleted) {
    return <div className="deleted">[Comment deleted]</div>;
  }

  return <div>{comment.content}</div>;
}
```