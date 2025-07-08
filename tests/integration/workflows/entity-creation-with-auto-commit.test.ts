import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { createTestUser, createTestCommunity, TEST_PREFIX } from '../helpers/test-data';
import { cleanupAllTestData } from '../helpers/cleanup';
import { signIn } from '@/features/auth/api';
import { uploadImage } from '@/features/images/api';
import { createResource } from '@/features/resources/api';
import { createCommunity } from '@/features/communities/api';
import { createEvent } from '@/features/events/api';
import { updateUser } from '@/features/users/api';
import { createFakeResourceData } from '@/features/resources/__fakes__';
import { createFakeCommunityData } from '@/features/communities/__fakes__';
import { createFakeEventData } from '@/features/events/__fakes__';
import { ResourceCategory } from '@/features/resources/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { User } from '@/features/users/types';
import type { CommunityInfo } from '@/features/communities/types';
import {
  createTestImageFile,
  verifyImageExistsInStorage,
  cleanupAllTestImages,
} from '../images/image-helpers';

describe('Entity Creation with Auto-Commit Image Workflow', () => {
  let supabase: SupabaseClient<Database>;
  let testUser: User;
  let testCommunity: CommunityInfo;

  beforeAll(async () => {
    supabase = createTestClient();

    // Create test user and community
    testUser = await createTestUser(supabase);
    await signIn(supabase, testUser.email, 'TestPass123!');
    testCommunity = await createTestCommunity(supabase);
  });

  afterAll(async () => {
    // Clean up all test images and data
    await cleanupAllTestImages();
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
      const tempExists1Before = await verifyImageExistsInStorage(tempImage1);
      const tempExists2Before = await verifyImageExistsInStorage(tempImage2);
      expect(tempExists1Before).toBe(true);
      expect(tempExists2Before).toBe(true);

      // 2. Create resource with temp URLs - API should auto-commit internally
      const resourceData = createFakeResourceData({
        title: `${TEST_PREFIX}Auto-Commit Resource ${Date.now()}`,
        description: 'Test resource with auto-commit images',
        imageUrls: [tempImage1, tempImage2],
        communityId: testCommunity.id,
        category: ResourceCategory.TOOLS,
        type: 'offer',
      });

      const resource = await createResource(supabase, resourceData);

      // 3. Verify resource was created with permanent URLs (not temp URLs)
      expect(resource).toBeTruthy();
      expect(resource.imageUrls).toHaveLength(2);
      expect(resource.imageUrls![0]).not.toContain('temp-upload-');
      expect(resource.imageUrls![0]).toContain(`resource-${resource.id}`);
      expect(resource.imageUrls![1]).not.toContain('temp-upload-');
      expect(resource.imageUrls![1]).toContain(`resource-${resource.id}`);

      // 4. Verify temp images were moved to permanent storage (not copied)
      const tempExists1After = await verifyImageExistsInStorage(tempImage1);
      const tempExists2After = await verifyImageExistsInStorage(tempImage2);
      expect(tempExists1After).toBe(false); // Moved, not copied
      expect(tempExists2After).toBe(false);

      // 5. Verify permanent images exist
      const permExists1 = await verifyImageExistsInStorage(resource.imageUrls![0]);
      const permExists2 = await verifyImageExistsInStorage(resource.imageUrls![1]);
      expect(permExists1).toBe(true);
      expect(permExists2).toBe(true);
    });

    it('creates resource without images successfully', async () => {
      const resourceData = createFakeResourceData({
        title: `${TEST_PREFIX}No Images Resource ${Date.now()}`,
        communityId: testCommunity.id,
        category: ResourceCategory.SKILLS,
        type: 'request',
        // No imageUrls
      });

      const resource = await createResource(supabase, resourceData);

      expect(resource).toBeTruthy();
      expect(resource.imageUrls || []).toHaveLength(0);
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
      const tempExists = await verifyImageExistsInStorage(tempBanner);
      expect(tempExists).toBe(true);

      // Create community - should auto-commit banner
      const communityData = createFakeCommunityData({
        name: `${TEST_PREFIX}Auto-Commit Community ${Date.now()}`,
        description: 'Test community with auto-commit banner',
        bannerImageUrl: tempBanner,
      });

      const community = await createCommunity(supabase, communityData);

      // Verify banner was committed
      expect(community).toBeTruthy();
      expect(community.bannerImageUrl).toBeTruthy();
      expect(community.bannerImageUrl).not.toContain('temp-upload-');
      expect(community.bannerImageUrl).toContain(`community-${community.id}`);

      // Verify temp banner was moved
      const tempExistsAfter = await verifyImageExistsInStorage(tempBanner);
      expect(tempExistsAfter).toBe(false);

      // Verify permanent banner exists
      const permExists = await verifyImageExistsInStorage(community.bannerImageUrl!);
      expect(permExists).toBe(true);
    });

    it('creates community without banner successfully', async () => {
      const communityData = createFakeCommunityData({
        name: `${TEST_PREFIX}No Banner Community ${Date.now()}`,
        bannerImageUrl: undefined, // Explicitly set to undefined
      });

      const community = await createCommunity(supabase, communityData);

      expect(community).toBeTruthy();
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
      const tempExists = await verifyImageExistsInStorage(tempAvatar);
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
      const tempExistsAfter = await verifyImageExistsInStorage(tempAvatar);
      expect(tempExistsAfter).toBe(false);

      // Verify permanent avatar exists
      const permExists = await verifyImageExistsInStorage(updatedUser.avatarUrl!);
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

  describe('Event Creation with Images Auto-Commit', () => {
    it('creates event with temporary images and auto-commits them', async () => {
      // Upload temporary event images
      const tempImage1 = await uploadImage({
        supabase,
        file: createTestImageFile({
          name: `${TEST_PREFIX}event-img1-${Date.now()}.jpg`,
        }),
        folder: 'temp-upload',
      });
      const tempImage2 = await uploadImage({
        supabase,
        file: createTestImageFile({
          name: `${TEST_PREFIX}event-img2-${Date.now()}.jpg`,
        }),
        folder: 'temp-upload',
      });

      // Create event with temp images
      const eventData = createFakeEventData({
        title: `${TEST_PREFIX}Auto-Commit Event ${Date.now()}`,
        description: 'Test event with auto-commit images',
        imageUrls: [tempImage1, tempImage2],
        communityId: testCommunity.id,
        organizerId: testUser.id, // Add organizer ID for RLS
        startDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        endDateTime: new Date(Date.now() + 25 * 60 * 60 * 1000), // Tomorrow + 1 hour
      });

      const event = await createEvent(supabase, eventData);

      // Verify event was created with permanent URLs
      expect(event).toBeTruthy();
      expect(event.imageUrls).toHaveLength(2);
      expect(event.imageUrls![0]).not.toContain('temp-upload-');
      expect(event.imageUrls![0]).toContain(`event-${event.id}`);
      expect(event.imageUrls![1]).not.toContain('temp-upload-');
      expect(event.imageUrls![1]).toContain(`event-${event.id}`);

      // Verify temp images were moved
      const tempExists1 = await verifyImageExistsInStorage(tempImage1);
      const tempExists2 = await verifyImageExistsInStorage(tempImage2);
      expect(tempExists1).toBe(false);
      expect(tempExists2).toBe(false);

      // Verify permanent images exist
      const permExists1 = await verifyImageExistsInStorage(event.imageUrls![0]);
      const permExists2 = await verifyImageExistsInStorage(event.imageUrls![1]);
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
      const permanentUrl = 'https://test.supabase.co/storage/v1/object/public/images/user-123/resource-existing-123-image.jpg';

      // Create resource with mixed URLs
      const resourceData = createFakeResourceData({
        title: `${TEST_PREFIX}Mixed URLs Resource ${Date.now()}`,
        imageUrls: [tempImage, permanentUrl],
        communityId: testCommunity.id,
        category: ResourceCategory.OTHER,
        type: 'offer',
      });

      const resource = await createResource(supabase, resourceData);

      // Verify: temp was committed, permanent was unchanged
      expect(resource.imageUrls).toHaveLength(2);
      expect(resource.imageUrls![0]).not.toContain('temp-upload-');
      expect(resource.imageUrls![0]).toContain(`resource-${resource.id}`); // Committed
      expect(resource.imageUrls![1]).toBe(permanentUrl); // Unchanged

      // Verify temp image was moved
      const tempExists = await verifyImageExistsInStorage(tempImage);
      expect(tempExists).toBe(false);

      // Verify committed image exists
      const permExists = await verifyImageExistsInStorage(resource.imageUrls![0]);
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

      const resourceData = createFakeResourceData({
        title: `${TEST_PREFIX}Resilience Test Resource ${Date.now()}`,
        imageUrls: [
          tempImage,
          'invalid-url',
          '', // Empty string
          'https://invalid-domain.com/image.jpg',
        ],
        communityId: testCommunity.id,
        category: ResourceCategory.SUPPLIES,
        type: 'request',
      });

      // Should create resource successfully despite invalid URLs
      const resource = await createResource(supabase, resourceData);

      expect(resource).toBeTruthy();
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
      const resourceData = createFakeResourceData({
        title: `${TEST_PREFIX}Empty Images Resource ${Date.now()}`,
        imageUrls: [], // Empty array
        communityId: testCommunity.id,
        category: ResourceCategory.FOOD,
        type: 'offer',
      });

      const resource = await createResource(supabase, resourceData);

      expect(resource).toBeTruthy();
      expect(resource.imageUrls || []).toHaveLength(0);
    });
  });
});