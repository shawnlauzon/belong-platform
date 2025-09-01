/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import {
  createTestUser,
  createTestCommunity,
  createTestResource,
  createTestShoutout,
} from '../helpers/test-data';
import {
  createComment,
  fetchComments,
  updateComment,
  deleteComment,
} from '@/features/comments';
import { signIn } from '@/features/auth/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { User } from '@/features/users';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities';
import { joinCommunity } from '@/features/communities/api';

describe('Comments CRUD', () => {
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

  describe('Creating comments', () => {
    it('should create a comment on a resource', async () => {
      // Use existing test user and community
      await signIn(supabase, testUser.email, 'TestPass123!');

      // Create a resource
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      // Create a comment on the resource
      const comment = await createComment(supabase, {
        content: 'This is a test comment',
        resourceId: resource.id,
      });

      expect(comment).toBeDefined();
      expect(comment.content).toBe('This is a test comment');
      expect(comment.resourceId).toBe(resource.id);
      expect(comment.shoutoutId).toBeUndefined();
      expect(comment.parentId).toBeUndefined();
      expect(comment.isEdited).toBe(false);
      expect(comment.isDeleted).toBe(false);
    });

    it('should create a comment on a shoutout', async () => {
      // Create fresh community for this test
      await signIn(supabase, testUser.email, 'TestPass123!');
      const community = await createTestCommunity(supabase);

      // Create receiver user and have them join the community
      const receiver = await createTestUser(supabase);
      await joinCommunity(supabase, community.id);

      // Use existing test user as sender
      await signIn(supabase, testUser.email, 'TestPass123!');

      // Create a resource and shoutout
      const resource = await createTestResource(
        supabase,
        community.id,
        'offer',
      );

      const shoutout = await createTestShoutout(supabase, {
        resourceId: resource.id,
        receiverId: receiver.id,
        communityId: community.id,
        message: 'Thanks for your help!',
      });

      // Create a comment on the shoutout
      const comment = await createComment(supabase, {
        content: 'Great shoutout!',
        shoutoutId: shoutout.id,
      });

      expect(comment).toBeDefined();
      expect(comment.content).toBe('Great shoutout!');
      expect(comment.shoutoutId).toBe(shoutout.id);
      expect(comment.resourceId).toBeUndefined();
    });

    it('should create a nested reply (max 2 levels)', async () => {
      await signIn(supabase, testUser.email, 'TestPass123!');

      // Create a resource
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      // Create a top-level comment
      const topComment = await createComment(supabase, {
        content: 'Top level comment',
        resourceId: resource.id,
      });

      // Create a reply to the top-level comment
      const reply = await createComment(supabase, {
        content: 'This is a reply',
        resourceId: resource.id,
        parentId: topComment.id,
      });

      expect(reply.parentId).toBe(topComment.id);
      expect(reply.resourceId).toBe(resource.id);
    });

    it('should reject creating a 3rd level nested comment', async () => {
      await signIn(supabase, testUser.email, 'TestPass123!');

      // Create a resource
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      // Create a top-level comment
      const topComment = await createComment(supabase, {
        content: 'Top level comment',
        resourceId: resource.id,
      });

      // Create a reply to the top-level comment
      const reply = await createComment(supabase, {
        content: 'This is a reply',
        resourceId: resource.id,
        parentId: topComment.id,
      });

      // Try to create a reply to the reply (3rd level) - should fail
      await expect(
        createComment(supabase, {
          content: 'This should fail',
          resourceId: resource.id,
          parentId: reply.id,
        }),
      ).rejects.toThrow();
    });

    it('should fail when neither resourceId nor shoutoutId is provided', async () => {
      await signIn(supabase, testUser.email, 'TestPass123!');

      await expect(
        createComment(supabase, {
          content: 'Invalid comment',
        }),
      ).rejects.toThrow(
        'Comment must be associated with either a resource or a shoutout',
      );
    });

    it('should fail when both resourceId and shoutoutId are provided', async () => {
      await signIn(supabase, testUser.email, 'TestPass123!');

      await expect(
        createComment(supabase, {
          content: 'Invalid comment',
          resourceId: 'some-id',
          shoutoutId: 'another-id',
        }),
      ).rejects.toThrow(
        'Comment must be associated with either a resource or a shoutout',
      );
    });
  });

  describe('Fetching comments', () => {
    it('should fetch comments for a resource with nested structure', async () => {
      const user1 = testUser;

      // Create a resource
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      // Create top-level comments
      const comment1 = await createComment(supabase, {
        content: 'First comment',
        resourceId: resource.id,
      });

      await createComment(supabase, {
        content: 'Second comment',
        resourceId: resource.id,
      });

      // Create replies
      const reply1 = await createComment(supabase, {
        content: 'Reply to first',
        resourceId: resource.id,
        parentId: comment1.id,
      });

      // Switch to user2 and add a reply
      const user2 = await createTestUser(supabase);
      await joinCommunity(supabase, testCommunity.id);

      const reply2 = await createComment(supabase, {
        content: 'Another reply to first',
        resourceId: resource.id,
        parentId: comment1.id,
      });

      // Fetch all comments for the resource
      const comments = await fetchComments(supabase, {
        resourceId: resource.id,
      });

      expect(comments).toHaveLength(2); // Two top-level comments
      expect(comments[0].content).toBe('First comment');
      expect(comments[0].replies).toHaveLength(2);
      expect(comments[0].replies![0].content).toBe('Reply to first');
      expect(comments[0].replies![1].content).toBe('Another reply to first');
      expect(comments[1].content).toBe('Second comment');
      expect(comments[1].replies).toBeUndefined();
    });

    it('should exclude deleted comments by default', async () => {
      await signIn(supabase, testUser.email, 'TestPass123!');

      // Create a resource
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      // Create comments
      const comment1 = await createComment(supabase, {
        content: 'Visible comment',
        resourceId: resource.id,
      });

      const comment2 = await createComment(supabase, {
        content: 'To be deleted',
        resourceId: resource.id,
      });

      // Delete comment2
      await deleteComment(supabase, comment2.id);

      // Fetch comments without includeDeleted flag
      const comments = await fetchComments(supabase, {
        resourceId: resource.id,
      });

      expect(comments).toHaveLength(1);
      expect(comments[0].content).toBe('Visible comment');

      // // Fetch comments without includeDeleted flag
      // const comments = await fetchComments(supabase, {
      //   resourceId: resource.id,
      // });

      // expect(comments).toHaveLength(1);
      // expect(comments[0].content).toBe('Visible comment');
    });

    it('should include deleted comments when requested', async () => {
      await signIn(supabase, testUser.email, 'TestPass123!');

      // Create a resource
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      // Create comments
      const comment1 = await createComment(supabase, {
        content: 'Visible comment',
        resourceId: resource.id,
      });

      const comment2 = await createComment(supabase, {
        content: 'To be deleted',
        resourceId: resource.id,
      });

      // Delete comment2
      await deleteComment(supabase, comment2.id);

      // Fetch comments with includeDeleted flag
      const comments = await fetchComments(supabase, {
        resourceId: resource.id,
        includeDeleted: true,
      });

      expect(comments).toHaveLength(2);
      expect(comments[1].isDeleted).toBe(true);
    });
  });

  describe('Updating comments', () => {
    it('should allow author to update their comment', async () => {
      await signIn(supabase, testUser.email, 'TestPass123!');

      // Create a resource
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      // Create a comment
      const comment = await createComment(supabase, {
        content: 'Original content',
        resourceId: resource.id,
      });

      // Update the comment
      const updated = await updateComment(
        supabase,
        comment.id,
        'Updated content',
      );

      expect(updated.content).toBe('Updated content');
      expect(updated.isEdited).toBe(true);
      expect(updated.id).toBe(comment.id);
    });

    it('should not allow non-author to update comment', async () => {
      const user1 = testUser;
      const user2 = await createTestUser(supabase);
      await joinCommunity(supabase, testCommunity.id);

      await signIn(supabase, user1.email, 'TestPass123!');

      // Create a resource
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      // Create a comment as user1
      const comment = await createComment(supabase, {
        content: 'Original content',
        resourceId: resource.id,
      });

      // Switch to user2 and try to update
      await signIn(supabase, user2.email, 'TestPass123!');

      await expect(
        updateComment(supabase, comment.id, 'Hacked content'),
      ).rejects.toThrow();
    });
  });

  describe('Comment count tracking', () => {
    it('should update resource comment count on comment creation and deletion', async () => {
      await signIn(supabase, testUser.email, 'TestPass123!');

      // Create a resource
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      // Check initial comment count
      const { data: initialResource } = await supabase
        .from('resources')
        .select('comment_count')
        .eq('id', resource.id)
        .single();

      expect(initialResource!.comment_count).toBe(0);

      // Create a comment
      const comment1 = await createComment(supabase, {
        content: 'First comment',
        resourceId: resource.id,
      });

      // Check count increased
      const { data: afterFirst } = await supabase
        .from('resources')
        .select('comment_count')
        .eq('id', resource.id)
        .single();

      expect(afterFirst!.comment_count).toBe(1);

      // Create another comment
      const comment2 = await createComment(supabase, {
        content: 'Second comment',
        resourceId: resource.id,
      });

      // Check count increased again
      const { data: afterSecond } = await supabase
        .from('resources')
        .select('comment_count')
        .eq('id', resource.id)
        .single();

      expect(afterSecond!.comment_count).toBe(2);

      // Delete a comment
      await deleteComment(supabase, comment1.id);

      // Check count decreased
      const { data: afterDelete } = await supabase
        .from('resources')
        .select('comment_count')
        .eq('id', resource.id)
        .single();

      expect(afterDelete!.comment_count).toBe(1);
    });

    it('should update shoutout comment count on comment creation and deletion', async () => {
      const receiver = await createTestUser(supabase);
      await joinCommunity(supabase, testCommunity.id);

      await signIn(supabase, testUser.email, 'TestPass123!');

      // Create required entities
      const resource = await createTestResource(
        supabase,
        testCommunity.id,
        'offer',
      );

      const shoutout = await createTestShoutout(supabase, {
        resourceId: resource.id,
        receiverId: receiver.id,
        communityId: testCommunity.id,
        message: 'Thanks for your help!',
      });

      // Check initial comment count
      const { data: initialShoutout } = await supabase
        .from('shoutouts')
        .select('comment_count')
        .eq('id', shoutout.id)
        .single();

      expect(initialShoutout!.comment_count).toBe(0);

      // Create a comment
      const comment = await createComment(supabase, {
        content: 'Nice shoutout!',
        shoutoutId: shoutout.id,
      });

      // Check count increased
      const { data: afterComment } = await supabase
        .from('shoutouts')
        .select('comment_count')
        .eq('id', shoutout.id)
        .single();

      expect(afterComment!.comment_count).toBe(1);

      // Delete the comment
      await deleteComment(supabase, comment.id);

      // Check count decreased
      const { data: afterDelete } = await supabase
        .from('shoutouts')
        .select('comment_count')
        .eq('id', shoutout.id)
        .single();

      expect(afterDelete!.comment_count).toBe(0);
    });
  });
});
