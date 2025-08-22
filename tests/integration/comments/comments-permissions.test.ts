/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import { createTestUser, createTestCommunity, createTestResource, createTestShoutout } from '../helpers/test-data';
import { createComment, updateComment, deleteComment } from '@/features/comments';
import { signIn } from '@/features/auth/api';
import { joinCommunity } from '@/features/communities/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { User } from '@/features/users';
import type { Community } from '@/features/communities';

describe('Comments Permissions', () => {
  let supabase: SupabaseClient<Database>;
  let testUser: User;
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

  describe('Delete permissions', () => {
    it('should allow comment author to delete their own comment', async () => {
      await signIn(supabase, testUser.email, 'TestPass123!');

      // Create a resource
      const resource = await createTestResource(supabase, testCommunity.id, 'offer');

      // Create a comment
      const comment = await createComment(supabase, {
        content: 'My comment',
        resourceId: resource.id,
      });

      // Delete own comment - should succeed
      const deleted = await deleteComment(supabase, comment.id);
      expect(deleted.isDeleted).toBe(true);
    });

    it.skip('should allow resource owner to delete comments on their resource', async () => {
      const resourceOwner = testUser;
      const commenter = await createTestUser(supabase);
      await joinCommunity(supabase, testCommunity.id);
      
      // Create resource as owner
      await signIn(supabase, resourceOwner.email, 'TestPass123!');
      const resource = await createTestResource(supabase, testCommunity.id, 'offer');

      // Create comment as commenter
      await signIn(supabase, commenter.email, 'TestPass123!');
      const comment = await createComment(supabase, {
        content: 'Someone else\'s comment',
        resourceId: resource.id,
      });

      // Switch back to resource owner
      await signIn(supabase, resourceOwner.email, 'TestPass123!');

      // Resource owner deletes comment - should succeed
      const deleted = await deleteComment(supabase, comment.id);
      expect(deleted.isDeleted).toBe(true);
    });

    it.skip('should allow shoutout sender to delete comments on their shoutout', async () => {
      const shoutoutSender = testUser;
      const receiver = await createTestUser(supabase);
      await joinCommunity(supabase, testCommunity.id);
      const commenter = await createTestUser(supabase);
      await joinCommunity(supabase, testCommunity.id);
      
      // Create resource and shoutout as sender
      await signIn(supabase, shoutoutSender.email, 'TestPass123!');
      const resource = await createTestResource(supabase, testCommunity.id, 'offer');

      const shoutout = await createTestShoutout({
        supabase,
        resourceId: resource.id,
        receiverId: receiver.id,
        communityId: testCommunity.id,
      });

      // Create comment as commenter
      await signIn(supabase, commenter.email, 'TestPass123!');
      const comment = await createComment(supabase, {
        content: 'Comment on shoutout',
        shoutoutId: shoutout.id,
      });

      // Switch back to shoutout sender
      await signIn(supabase, shoutoutSender.email, 'TestPass123!');

      // Shoutout sender deletes comment - should succeed
      const deleted = await deleteComment(supabase, comment.id);
      expect(deleted.isDeleted).toBe(true);
    });

    it('should not allow random user to delete others comments', async () => {
      const resourceOwner = testUser;
      const commenter = await createTestUser(supabase);
      await joinCommunity(supabase, testCommunity.id);
      const randomUser = await createTestUser(supabase);
      await joinCommunity(supabase, testCommunity.id);
      
      // Create resource as owner
      await signIn(supabase, resourceOwner.email, 'TestPass123!');
      const resource = await createTestResource(supabase, testCommunity.id, 'offer');

      // Create comment as commenter
      await signIn(supabase, commenter.email, 'TestPass123!');
      const comment = await createComment(supabase, {
        content: 'Someone\'s comment',
        resourceId: resource.id,
      });

      // Switch to random user and try to delete
      await signIn(supabase, randomUser.email, 'TestPass123!');

      // Random user tries to delete comment - should fail
      await expect(
        deleteComment(supabase, comment.id)
      ).rejects.toThrow();
    });

    it('should not allow shoutout receiver to delete comments (only sender can)', async () => {
      const shoutoutSender = testUser;
      
      const receiver = await createTestUser(supabase);
      await joinCommunity(supabase, testCommunity.id);

      // Create resource and shoutout as sender
      await signIn(supabase, shoutoutSender.email, 'TestPass123!');
      const resource = await createTestResource(supabase, testCommunity.id, 'offer');

      const shoutout = await createTestShoutout({
        supabase,
        resourceId: resource.id,
        receiverId: receiver.id,
        communityId: testCommunity.id,
      });

      // Create comment as commenter
      const commenter = await createTestUser(supabase);
      await joinCommunity(supabase, testCommunity.id);
      
      const comment = await createComment(supabase, {
        content: 'Comment on shoutout',
        shoutoutId: shoutout.id,
      });

      // Switch to receiver and try to delete
      await signIn(supabase, receiver.email, 'TestPass123!');

      // Receiver tries to delete comment - should fail
      await expect(
        deleteComment(supabase, comment.id)
      ).rejects.toThrow();
    });
  });

  describe('Update permissions', () => {
    it('should only allow comment author to update their comment', async () => {
      const author = testUser;
      const otherUser = await createTestUser(supabase);
      await joinCommunity(supabase, testCommunity.id);
      
      // Create resource and comment as author
      await signIn(supabase, author.email, 'TestPass123!');
      const resource = await createTestResource(supabase, testCommunity.id, 'offer');

      const comment = await createComment(supabase, {
        content: 'Original content',
        resourceId: resource.id,
      });

      // Author can update
      const updated = await updateComment(supabase, comment.id, 'Updated by author');
      expect(updated.content).toBe('Updated by author');
      expect(updated.isEdited).toBe(true);

      // Other user cannot update
      await signIn(supabase, otherUser.email, 'TestPass123!');

      await expect(
        updateComment(supabase, comment.id, 'Hacked content')
      ).rejects.toThrow();
    });

    it('should not allow resource owner to edit comments (only delete)', async () => {
      const resourceOwner = testUser;
      const commenter = await createTestUser(supabase);
      
      // Create resource as owner
      await signIn(supabase, resourceOwner.email, 'TestPass123!');
      const resource = await createTestResource(supabase, testCommunity.id, 'offer');

      // Create comment as commenter
      await signIn(supabase, commenter.email, 'TestPass123!');
      const comment = await createComment(supabase, {
        content: 'Someone else\'s comment',
        resourceId: resource.id,
      });

      // Switch back to resource owner
      await signIn(supabase, resourceOwner.email, 'TestPass123!');

      // Resource owner tries to edit comment - should fail
      await expect(
        updateComment(supabase, comment.id, 'Edited by owner')
      ).rejects.toThrow();
    });
  });

  describe('Create permissions', () => {
    it('should require authentication to create comments', async () => {
      // Sign out to ensure no authentication
      await supabase.auth.signOut();
      
      // Try to create comment without authentication
      await expect(
        createComment(supabase, {
          content: 'Unauthenticated comment',
          resourceId: 'some-id',
        })
      ).rejects.toThrow('User must be authenticated to create comments');
    });

    it('should allow any authenticated user to comment on public resources', async () => {
      const resourceOwner = testUser;
      const commenter1 = await createTestUser(supabase);
      const commenter2 = await createTestUser(supabase);
      
      // Create resource as owner
      await signIn(supabase, resourceOwner.email, 'TestPass123!');
      const resource = await createTestResource(supabase, testCommunity.id, 'offer');

      // Multiple users can comment
      await signIn(supabase, commenter1.email, 'TestPass123!');
      const comment1 = await createComment(supabase, {
        content: 'Comment from user 1',
        resourceId: resource.id,
      });
      expect(comment1).toBeDefined();

      await signIn(supabase, commenter2.email, 'TestPass123!');
      const comment2 = await createComment(supabase, {
        content: 'Comment from user 2',
        resourceId: resource.id,
      });
      expect(comment2).toBeDefined();
    });
  });
});