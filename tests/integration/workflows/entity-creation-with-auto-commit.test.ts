import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import {
  createTestUser,
  createTestCommunity,
  TEST_PREFIX,
} from '../helpers/test-data';
import { cleanupAllTestData } from '../helpers/cleanup';
import { signIn } from '@/features/auth/api';
import { uploadImage } from '@/features/images/api';
import { createResource } from '@/features/resources/api';
import { createCommunity } from '@/features/communities/api';
import { createGathering } from '@/features/gatherings/api';
import { updateUser } from '@/features/users/api';
import { createFakeResourceInput } from '@/features/resources/__fakes__';
import { createFakeCommunityInput } from '@/features/communities/__fakes__';
import { createFakeGatheringInput } from '@/features/gatherings/__fakes__';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { User } from '@/features/users/types';
import type { Community } from '@/features/communities/types';
import {
  createTestImageFile,
  verifyImagesExist,
  cleanupTestImages,
} from '../images/image-helpers-optimized';

describe.skip('Entity Creation with Auto-Commit Image Workflow', () => {
  let supabase: SupabaseClient<Database>;
  let testUser: User;
  let testCommunity: Community;

  beforeAll(async () => {
    supabase = createTestClient();

    // Create test user and community
    testUser = await createTestUser(supabase);
    await signIn(supabase, testUser.email, 'TestPass123!');
    testCommunity = await createTestCommunity(supabase);
  });

  afterAll(async () => {
    // Clean up all test images and data
    await cleanupTestImages([]);
    await cleanupAllTestData();
  });

  describe('Resource Creation with Auto-Commit', () => {
    it('creates resource with temporary images and auto-commits them', async () => {
      // 1. Upload temporary images
      const tempImage1 = await uploadImage({
        supabase,
        file: createTestImageFile({
          name: `${TEST_PREFIX}resource-img1-${Date.now()}.jpg`,
        }),
        folder: 'temp-upload',
      });
      const tempImage2 = await uploadImage({
        supabase,
        file: createTestImageFile({
          name: `${TEST_PREFIX}resource-img2-${Date.now()}.jpg`,
        }),
        folder: 'temp-upload',
      });

      // Verify temp images exist
      const tempExists1Before = await verifyImagesExist([tempImage1]);
      const tempExists2Before = await verifyImagesExist([tempImage2]);
      expect(tempExists1Before).toBe(true);
      expect(tempExists2Before).toBe(true);

      // 2. Create resource with temp URLs - API should auto-commit internally
      const resourceData = createFakeResourceInput({
        title: `${TEST_PREFIX}Auto-Commit Resource ${Date.now()}`,
        description: 'Test resource with auto-commit images',
        imageUrls: [tempImage1, tempImage2],
        communityId: testCommunity.id,
        category: 'tools',
        type: 'offer',
      });

      const resource = await createResource(supabase, resourceData);

      // 3. Verify resource was created with permanent URLs (not temp URLs)
      expect(resource).toBeTruthy();
      if (!resource) throw new Error('Resource should exist');
      expect(resource.imageUrls).toHaveLength(2);
      expect(resource.imageUrls![0]).not.toContain('temp-upload-');
      expect(resource.imageUrls![0]).toContain(`resource-${resource.id}`);
      expect(resource.imageUrls![1]).not.toContain('temp-upload-');
      expect(resource.imageUrls![1]).toContain(`resource-${resource.id}`);

      // 4. Verify temp images were moved to permanent storage (not copied)
      const tempExists1After = await verifyImagesExist([tempImage1]);
      const tempExists2After = await verifyImagesExist([tempImage2]);
      expect(tempExists1After).toBe(false); // Moved, not copied
      expect(tempExists2After).toBe(false);

      // 5. Verify permanent images exist
      const permExists1 = await verifyImagesExist([resource.imageUrls![0]]);
      const permExists2 = await verifyImagesExist([resource.imageUrls![1]]);
      expect(permExists1).toBe(true);
      expect(permExists2).toBe(true);
    });

    it('creates resource without images successfully', async () => {
      const resourceData = createFakeResourceInput({
        title: `${TEST_PREFIX}No Images Resource ${Date.now()}`,
        communityId: testCommunity.id,
        category: 'skills',
        type: 'request',
        // No imageUrls
      });

      const resource = await createResource(supabase, resourceData);

      expect(resource).toBeTruthy();
      expect(resource?.imageUrls || []).toHaveLength(0);
    });
  });

  describe('Community Creation with Banner Auto-Commit', () => {
    it('creates community with temporary banner and auto-commits it', async () => {
      // Upload temp banner
      const tempBanner = await uploadImage({
        supabase,
        file: createTestImageFile({
          name: `${TEST_PREFIX}community-banner-${Date.now()}.jpg`,
        }),
        folder: 'temp-upload',
      });

      // Verify temp banner exists
      const tempExists = await verifyImagesExist([tempBanner]);
      expect(tempExists).toBe(true);

      // Create community - should auto-commit banner
      const communityData = createFakeCommunityInput({
        name: `${TEST_PREFIX}Auto-Commit Community ${Date.now()}`,
        description: 'Test community with auto-commit banner',
        bannerImageUrl: tempBanner,
      });

      const community = await createCommunity(supabase, communityData);

      // Verify banner was committed
      expect(community).toBeTruthy();
      if (!community) throw new Error('Community should exist');
      expect(community.bannerImageUrl).toBeTruthy();
      expect(community.bannerImageUrl).not.toContain('temp-upload-');
      expect(community.bannerImageUrl).toContain(`community-${community.id}`);

      // Verify temp banner was moved
      const tempExistsAfter = await verifyImagesExist([tempBanner]);
      expect(tempExistsAfter).toBe(false);

      // Verify permanent banner exists
      const permExists = await verifyImagesExist([community.bannerImageUrl!]);
      expect(permExists).toBe(true);
    });

    it('creates community without banner successfully', async () => {
      const communityData = createFakeCommunityInput({
        name: `${TEST_PREFIX}No Banner Community ${Date.now()}`,
        bannerImageUrl: undefined, // Explicitly set to undefined
      });

      const community = await createCommunity(supabase, communityData);

      expect(community).toBeTruthy();
      if (!community) throw new Error('Community should exist');
      expect(community.bannerImageUrl).toBeFalsy();
    });
  });

  describe('User Profile Update with Avatar Auto-Commit', () => {
    it('updates user with temporary avatar and auto-commits it', async () => {
      // Upload temp avatar
      const tempAvatar = await uploadImage({
        supabase,
        file: createTestImageFile({
          name: `${TEST_PREFIX}user-avatar-${Date.now()}.jpg`,
        }),
        folder: 'temp-upload',
      });

      // Verify temp avatar exists
      const tempExists = await verifyImagesExist([tempAvatar]);
      expect(tempExists).toBe(true);

      // Update user - should auto-commit avatar
      const updatedUser = await updateUser(supabase, {
        id: testUser.id,
        avatarUrl: tempAvatar,
        bio: 'Updated bio with new avatar',
      });

      // Verify avatar was committed
      expect(updatedUser).toBeTruthy();
      expect(updatedUser.avatarUrl).toBeTruthy();
      expect(updatedUser.avatarUrl).not.toContain('temp-upload-');
      expect(updatedUser.avatarUrl).toContain(`user-${testUser.id}`);

      // Verify temp avatar was moved
      const tempExistsAfter = await verifyImagesExist([tempAvatar]);
      expect(tempExistsAfter).toBe(false);

      // Verify permanent avatar exists
      const permExists = await verifyImagesExist([updatedUser.avatarUrl!]);
      expect(permExists).toBe(true);
    });

    it('updates user without avatar successfully', async () => {
      const updatedUser = await updateUser(supabase, {
        id: testUser.id,
        bio: 'Updated bio without avatar change',
      });

      expect(updatedUser).toBeTruthy();
      expect(updatedUser.bio).toBe('Updated bio without avatar change');
    });
  });

  describe('Gathering Creation with Images Auto-Commit', () => {
    it('creates gathering with temporary images and auto-commits them', async () => {
      // Upload temporary gathering images
      const tempImage1 = await uploadImage({
        supabase,
        file: createTestImageFile({
          name: `${TEST_PREFIX}gathering-img1-${Date.now()}.jpg`,
        }),
        folder: 'temp-upload',
      });
      const tempImage2 = await uploadImage({
        supabase,
        file: createTestImageFile({
          name: `${TEST_PREFIX}gathering-img2-${Date.now()}.jpg`,
        }),
        folder: 'temp-upload',
      });

      // Create gathering with temp images
      const gatheringData = createFakeGatheringInput({
        title: `${TEST_PREFIX}Auto-Commit Gathering ${Date.now()}`,
        description: 'Test gathering with auto-commit images',
        imageUrls: [tempImage1, tempImage2],
        communityId: testCommunity.id,
        startDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        endDateTime: new Date(Date.now() + 25 * 60 * 60 * 1000), // Tomorrow + 1 hour
      });

      const gathering = await createGathering(supabase, gatheringData);

      // Verify gathering was created with permanent URLs
      expect(gathering).toBeTruthy();
      if (!gathering) throw new Error('Gathering should exist');
      expect(gathering.imageUrls).toHaveLength(2);
      expect(gathering.imageUrls![0]).not.toContain('temp-upload-');
      expect(gathering.imageUrls![0]).toContain(`gathering-${gathering.id}`);
      expect(gathering.imageUrls![1]).not.toContain('temp-upload-');
      expect(gathering.imageUrls![1]).toContain(`gathering-${gathering.id}`);

      // Verify temp images were moved
      const tempExists1 = await verifyImagesExist([tempImage1]);
      const tempExists2 = await verifyImagesExist([tempImage2]);
      expect(tempExists1).toBe(false);
      expect(tempExists2).toBe(false);

      // Verify permanent images exist
      const permExists1 = await verifyImagesExist([gathering.imageUrls![0]]);
      const permExists2 = await verifyImagesExist([gathering.imageUrls![1]]);
      expect(permExists1).toBe(true);
      expect(permExists2).toBe(true);
    });
  });

  describe('Mixed Temporary and Permanent URLs', () => {
    it('handles mixed temporary and permanent URLs correctly', async () => {
      // Upload one temp image
      const tempImage = await uploadImage({
        supabase,
        file: createTestImageFile({
          name: `${TEST_PREFIX}mixed-temp-${Date.now()}.jpg`,
        }),
        folder: 'temp-upload',
      });

      // Use a fake permanent URL (simulating an already committed image)
      const permanentUrl =
        'https://test.supabase.co/storage/v1/object/public/images/user-123/resource-existing-123-image.jpg';

      // Create resource with mixed URLs
      const resourceData = createFakeResourceInput({
        title: `${TEST_PREFIX}Mixed URLs Resource ${Date.now()}`,
        imageUrls: [tempImage, permanentUrl],
        communityId: testCommunity.id,
        category: 'other',
        type: 'offer',
      });

      const resource = await createResource(supabase, resourceData);

      // Verify: temp was committed, permanent was unchanged
      expect(resource?.imageUrls).toHaveLength(2);
      expect(resource?.imageUrls![0]).not.toContain('temp-upload-');
      expect(resource?.imageUrls![0]).toContain(`resource-${resource?.id}`); // Committed
      expect(resource?.imageUrls![1]).toBe(permanentUrl); // Unchanged

      // Verify temp image was moved
      const tempExists = await verifyImagesExist([tempImage]);
      expect(tempExists).toBe(false);

      // Verify committed image exists
      const permExists = await verifyImagesExist(resource?.imageUrls);
      expect(permExists).toBe(true);
    });
  });

  describe('Error Scenarios and Resilience', () => {
    it('creates entity successfully even with invalid image URLs', async () => {
      // Create resource with mix of valid temp image and invalid URLs
      const tempImage = await uploadImage({
        supabase,
        file: createTestImageFile({
          name: `${TEST_PREFIX}resilience-test-${Date.now()}.jpg`,
        }),
        folder: 'temp-upload',
      });

      const resourceData = createFakeResourceInput({
        title: `${TEST_PREFIX}Resilience Test Resource ${Date.now()}`,
        imageUrls: [
          tempImage,
          'invalid-url',
          '', // Empty string
          'https://invalid-domain.com/image.jpg',
        ],
        communityId: testCommunity.id,
        category: 'supplies',
        type: 'request',
      });

      // Should create resource successfully despite invalid URLs
      const resource = await createResource(supabase, resourceData);

      expect(resource).toBeTruthy();
      if (!resource) throw new Error('Resource should exist');
      // The API should handle invalid URLs gracefully
      // The exact behavior depends on the implementation
      if (resource.imageUrls && resource.imageUrls.length > 0) {
        // If any URLs remain, they should be valid
        for (const url of resource.imageUrls) {
          expect(url).toBeTruthy();
          expect(typeof url).toBe('string');
        }
      }
    });

    it('handles empty image arrays gracefully', async () => {
      const resourceData = createFakeResourceInput({
        title: `${TEST_PREFIX}Empty Images Resource ${Date.now()}`,
        imageUrls: [], // Empty array
        communityId: testCommunity.id,
        category: 'food',
        type: 'offer',
      });

      const resource = await createResource(supabase, resourceData);

      expect(resource).toBeTruthy();
      if (!resource) throw new Error('Resource should exist');
      expect(resource.imageUrls || []).toHaveLength(0);
    });
  });
});
