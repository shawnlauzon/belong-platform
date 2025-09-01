import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import {
  createTestUser,
  createTestCommunity,
  createTestResource,
} from '../helpers/test-data';
import {
  createComment,
  fetchComments,
  deleteComment,
} from '@/features/comments';
import { signIn } from '@/features/auth/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { Community, User } from '@/features';
import type { Account } from '@/features/auth/types';

describe('Comments Soft Delete Behavior', () => {
  let supabase: SupabaseClient<Database>;
  let testUser: Account;
  let testCommunity: Community;

  beforeAll(async () => {
    supabase = createTestClient();
    await cleanupAllTestData();

    // Create shared test data
    testUser = await createTestUser(supabase);
    testCommunity = await createTestCommunity(supabase);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('Soft delete with replies', () => {
    it('should prevent deletion of comments with replies', async () => {
      await signIn(supabase, testUser.email, 'TestPass123!');

      // Create a resource
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      // Create a top-level comment
      const topComment = await createComment(supabase, {
        content: 'This cannot be deleted',
        resourceId: resource.id,
      });

      // Create a reply to it
      const reply = await createComment(supabase, {
        content: 'Reply to parent comment',
        resourceId: resource.id,
        parentId: topComment.id,
      });

      // Try to delete the top-level comment - should fail
      await expect(deleteComment(supabase, topComment.id)).rejects.toThrow(
        'Cannot delete comment with replies. Please delete all replies first.',
      );

      // Verify the comment still exists and is not deleted
      const comments = await fetchComments(supabase, {
        resourceId: resource.id,
      });

      expect(comments).toHaveLength(1);
      expect(comments[0].isDeleted).toBe(false);
      expect(comments[0].content).toBe('This cannot be deleted');
      expect(comments[0].replies).toHaveLength(1);
      expect(comments[0].replies![0].content).toBe('Reply to parent comment');
    });
  });

  describe('Soft delete without replies', () => {
    it('should hide deleted comments without replies by default', async () => {
      await signIn(supabase, testUser.email, 'TestPass123!');

      // Create a resource
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      // Create comments
      const comment1 = await createComment(supabase, {
        content: 'This stays visible',
        resourceId: resource.id,
      });

      const comment2 = await createComment(supabase, {
        content: 'This will be deleted and hidden',
        resourceId: resource.id,
      });

      const comment3 = await createComment(supabase, {
        content: 'This also stays visible',
        resourceId: resource.id,
      });

      // Delete comment2 (no replies)
      await deleteComment(supabase, comment2.id);

      // Fetch without includeDeleted - deleted comment should not appear
      const visibleComments = await fetchComments(supabase, {
        resourceId: resource.id,
      });

      expect(visibleComments).toHaveLength(2);
      expect(visibleComments[0].content).toBe('This stays visible');
      expect(visibleComments[1].content).toBe('This also stays visible');

      // Fetch with includeDeleted - all comments should appear
      const allComments = await fetchComments(supabase, {
        resourceId: resource.id,
        includeDeleted: true,
      });

      expect(allComments).toHaveLength(3);
      expect(allComments[1].isDeleted).toBe(true);
    });

    it('should allow deleting replies without affecting parent', async () => {
      await signIn(supabase, testUser.email, 'TestPass123!');

      // Create a resource
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      // Create a top-level comment
      const topComment = await createComment(supabase, {
        content: 'Parent comment',
        resourceId: resource.id,
      });

      // Create multiple replies
      const reply1 = await createComment(supabase, {
        content: 'First reply',
        resourceId: resource.id,
        parentId: topComment.id,
      });

      const reply2 = await createComment(supabase, {
        content: 'Second reply to delete',
        resourceId: resource.id,
        parentId: topComment.id,
      });

      const reply3 = await createComment(supabase, {
        content: 'Third reply',
        resourceId: resource.id,
        parentId: topComment.id,
      });

      // Delete middle reply
      await deleteComment(supabase, reply2.id);

      // Fetch comments
      const comments = await fetchComments(supabase, {
        resourceId: resource.id,
      });

      expect(comments).toHaveLength(1);
      expect(comments[0].content).toBe('Parent comment');
      expect(comments[0].isDeleted).toBe(false);
      expect(comments[0].replies).toHaveLength(2); // Only non-deleted replies
      expect(comments[0].replies![0].content).toBe('First reply');
      expect(comments[0].replies![1].content).toBe('Third reply');
    });
  });

  describe('Comment count with soft delete', () => {
    it('should correctly track comment count with soft deletes', async () => {
      await signIn(supabase, testUser.email, 'TestPass123!');

      // Create a resource
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      // Create comments
      const comment1 = await createComment(supabase, {
        content: 'Comment 1',
        resourceId: resource.id,
      });

      const comment2 = await createComment(supabase, {
        content: 'Comment 2',
        resourceId: resource.id,
      });

      const reply = await createComment(supabase, {
        content: 'Reply to comment 1',
        resourceId: resource.id,
        parentId: comment1.id,
      });

      // Check initial count (3 total comments)
      let { data: resourceData } = await supabase
        .from('resources')
        .select('comment_count')
        .eq('id', resource.id)
        .single();

      expect(resourceData!.comment_count).toBe(3);

      // Delete a comment without replies
      await deleteComment(supabase, comment2.id);

      // Count should decrease
      ({ data: resourceData } = await supabase
        .from('resources')
        .select('comment_count')
        .eq('id', resource.id)
        .single());

      expect(resourceData!.comment_count).toBe(2);

      // Delete the reply
      await deleteComment(supabase, reply.id);

      // Count should be 1
      ({ data: resourceData } = await supabase
        .from('resources')
        .select('comment_count')
        .eq('id', resource.id)
        .single());

      expect(resourceData!.comment_count).toBe(1); // Only the parent remains

      // Delete a comment with deleted replies
      await deleteComment(supabase, comment1.id);

      // Count should decrease again
      ({ data: resourceData } = await supabase
        .from('resources')
        .select('comment_count')
        .eq('id', resource.id)
        .single());

      expect(resourceData!.comment_count).toBe(0);
    });

    it('should not double-count when deleting already deleted comments', async () => {
      await signIn(supabase, testUser.email, 'TestPass123!');

      // Create a resource
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      // Create a comment
      const comment = await createComment(supabase, {
        content: 'Test comment',
        resourceId: resource.id,
      });

      // Check initial count
      let { data: resourceData } = await supabase
        .from('resources')
        .select('comment_count')
        .eq('id', resource.id)
        .single();

      expect(resourceData!.comment_count).toBe(1);

      // Delete the comment
      await deleteComment(supabase, comment.id);

      // Count should be 0
      ({ data: resourceData } = await supabase
        .from('resources')
        .select('comment_count')
        .eq('id', resource.id)
        .single());

      expect(resourceData!.comment_count).toBe(0);

      // Try to "delete" it again (this would just update is_deleted from true to true)
      // This should not affect the count
      const { error } = await supabase
        .from('comments')
        .update({ is_deleted: true })
        .eq('id', comment.id);

      expect(error).toBeNull();

      // Count should still be 0
      ({ data: resourceData } = await supabase
        .from('resources')
        .select('comment_count')
        .eq('id', resource.id)
        .single());

      expect(resourceData!.comment_count).toBe(0);
    });
  });
});
