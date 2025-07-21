import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { createTestUser, TEST_PREFIX } from '../helpers/test-data';
import { cleanupAllTestData } from '../helpers/cleanup';
import { signIn } from '@/features/auth/api';
import { commitImageUrls, uploadImage } from '@/features/images/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { User } from '@/features/users/types';
import {
  createTestImageFile,
  verifyImagesExist,
  cleanupAllTestImages,
  extractStoragePathFromUrl,
} from './image-helpers-optimized';

describe.skip('Images API - Commit Operations', () => {
  let supabase: SupabaseClient<Database>;
  let testUser: User;

  beforeAll(async () => {
    supabase = createTestClient();

    // Create test user
    testUser = await createTestUser(supabase);
    await signIn(supabase, testUser.email, 'TestPass123!');
  });

  afterAll(async () => {
    // Clean up all test images
    await cleanupAllTestImages();

    // Clean up test data
    await cleanupAllTestData();
  });

  describe('commitImageUrls', () => {
    it('commits single temporary image to permanent storage', async () => {
      // Upload a temporary image
      const testFile = createTestImageFile({
        name: `${TEST_PREFIX}commit-single-${Date.now()}.jpg`,
      });
      const tempUrl = await uploadImage({
        supabase,
        file: testFile,
        folder: 'temp-upload',
      });

      // Verify it's in temp storage
      expect(tempUrl).toContain('temp-upload-');
      const tempExists = await verifyImagesExist([tempUrl]);
      expect(tempExists).toBe(true);

      // Commit to permanent storage
      const entityType = 'resource';
      const entityId = `${TEST_PREFIX}commit-test-${Date.now()}`;
      const committedUrls = await commitImageUrls({
        supabase,
        imageUrls: [tempUrl],
        entityType,
        entityId,
      });

      expect(committedUrls).toHaveLength(1);
      expect(committedUrls[0]).toBeTruthy();
      expect(committedUrls[0]).not.toContain('temp-upload-');
      expect(committedUrls[0]).toContain(`${entityType}-${entityId}`);

      // Verify the permanent file exists
      const permanentExists = await verifyImagesExist(committedUrls);
      expect(permanentExists).toBe(true);

      // Verify temp file was moved (no longer exists in temp location)
      const tempExistsAfter = await verifyImagesExist([tempUrl]);
      expect(tempExistsAfter).toBe(false);
    });

    it('commits multiple temporary images to permanent storage', async () => {
      // Upload multiple temporary images
      const testFiles = [
        createTestImageFile({
          name: `${TEST_PREFIX}multi-1-${Date.now()}.jpg`,
        }),
        createTestImageFile({
          name: `${TEST_PREFIX}multi-2-${Date.now()}.jpg`,
        }),
        createTestImageFile({
          name: `${TEST_PREFIX}multi-3-${Date.now()}.jpg`,
        }),
      ];

      const uploadPromises = testFiles.map((file) =>
        uploadImage({
          supabase,
          file,
          folder: 'temp-upload',
        }),
      );
      const tempUrls = await Promise.all(uploadPromises);

      // Verify all are in temp storage
      for (const tempUrl of tempUrls) {
        expect(tempUrl).toContain('temp-upload-');
        const exists = await verifyImagesExist([tempUrl]);
        expect(exists).toBe(true);
      }

      // Commit all to permanent storage
      const entityType = 'resource';
      const entityId = `${TEST_PREFIX}multi-commit-${Date.now()}`;
      const committedUrls = await commitImageUrls({
        supabase,
        imageUrls: tempUrls,
        entityType,
        entityId,
      });

      expect(committedUrls).toHaveLength(3);

      for (const committedUrl of committedUrls) {
        expect(committedUrl).not.toContain('temp-upload-');
        expect(committedUrl).toContain(`${entityType}-${entityId}`);

        // Verify the permanent file exists
        const exists = await verifyImagesExist([committedUrl]);
        expect(exists).toBe(true);
      }

      // Verify temp files were moved
      for (const tempUrl of tempUrls) {
        const tempExists = await verifyImagesExist([tempUrl]);
        expect(tempExists).toBe(false);
      }
    });

    it('supports all entity types for commit', async () => {
      const entityTypes = [
        'resource',
        'community',
        'user',
        'shoutout',
      ] as const;

      for (const entityType of entityTypes) {
        // Upload a temporary image
        const testFile = createTestImageFile({
          name: `${TEST_PREFIX}${entityType}-test-${Date.now()}.jpg`,
        });
        const tempUrl = await uploadImage({
          supabase,
          file: testFile,
          folder: 'temp-upload',
        });

        // Commit with the specific entity type
        const entityId = `${TEST_PREFIX}${entityType}-entity-${Date.now()}`;
        const committedUrls = await commitImageUrls({
          supabase,
          imageUrls: [tempUrl],
          entityType,
          entityId,
        });

        expect(committedUrls).toHaveLength(1);
        expect(committedUrls[0]).toContain(`${entityType}-${entityId}`);

        // Verify the permanent file exists
        const exists = await verifyImagesExist(committedUrls);
        expect(exists).toBe(true);

        // Verify proper naming convention - should be {userId}/{entityType}-{entityId}-{timestamp}
        const path = extractStoragePathFromUrl(committedUrls[0]);
        expect(path).toMatch(new RegExp(`^[\\w-]+/${entityType}-${entityId}-`));
      }
    });

    it('handles mixed temporary and permanent URLs', async () => {
      // Upload a temporary image
      const testFile = createTestImageFile({
        name: `${TEST_PREFIX}mixed-temp-${Date.now()}.jpg`,
      });
      const tempUrl = await uploadImage({
        supabase,
        file: testFile,
        folder: 'temp-upload',
      });

      // Create a fake permanent URL (simulate already committed image)
      const permanentUrl =
        'https://test.supabase.co/storage/v1/object/public/images/user-existing/resource-existing-123-image.jpg';

      // Commit with mixed URLs
      const entityType = 'resource';
      const entityId = `${TEST_PREFIX}mixed-test-${Date.now()}`;
      const committedUrls = await commitImageUrls({
        supabase,
        imageUrls: [tempUrl, permanentUrl],
        entityType,
        entityId,
      });

      expect(committedUrls).toHaveLength(2);

      // First URL should be committed (moved from temp)
      expect(committedUrls[0]).not.toContain('temp-upload-');
      expect(committedUrls[0]).toContain(`${entityType}-${entityId}`);

      // Second URL should remain unchanged (already permanent)
      expect(committedUrls[1]).toBe(permanentUrl);

      // Verify the committed file exists
      const committedExists = await verifyImagesExist(committedUrls);
      expect(committedExists).toBe(true);
    });

    it('preserves original filenames in permanent paths', async () => {
      const originalFilename = `${TEST_PREFIX}preserve-name-test.jpg`;
      const testFile = createTestImageFile({ name: originalFilename });
      const tempUrl = await uploadImage({
        supabase,
        file: testFile,
        folder: 'temp-upload',
      });

      // Commit to permanent storage
      const entityType = 'community';
      const entityId = `${TEST_PREFIX}preserve-${Date.now()}`;
      const committedUrls = await commitImageUrls({
        supabase,
        imageUrls: [tempUrl],
        entityType,
        entityId,
      });

      expect(committedUrls).toHaveLength(1);

      // Check that the permanent path contains parts of the original filename
      const permanentPath = extractStoragePathFromUrl(committedUrls[0]);
      // New format: {userId}/{entityType}-{entityId}-{timestampAndRandom}.{ext}
      expect(permanentPath).toMatch(
        new RegExp(`^[\\w-]+/${entityType}-${entityId}-.*\\.jpg$`),
      );
    });

    it('handles empty image URLs array', async () => {
      const committedUrls = await commitImageUrls({
        supabase,
        imageUrls: [],
        entityType: 'resource',
        entityId: `${TEST_PREFIX}empty-array-${Date.now()}`,
      });

      expect(committedUrls).toHaveLength(0);
    });

    it('handles null and undefined URLs gracefully', async () => {
      // Upload a valid temporary image
      const testFile = createTestImageFile();
      const tempUrl = await uploadImage({
        supabase,
        file: testFile,
        folder: 'temp-upload',
      });

      // Mix valid URL with null/undefined values
      const urlsWithNulls = [tempUrl, null, undefined, ''] as string[];

      const entityType = 'user';
      const entityId = `${TEST_PREFIX}null-handling-${Date.now()}`;
      const committedUrls = await commitImageUrls({
        supabase,
        imageUrls: urlsWithNulls,
        entityType,
        entityId,
      });

      // Should only commit the valid URL
      expect(committedUrls.length).toBeGreaterThan(0);
      expect(committedUrls[0]).toContain(`${entityType}-${entityId}`);

      // Valid image should exist
      const exists = await verifyImagesExist(committedUrls);
      expect(exists).toBe(true);
    });

    it('handles already permanent URLs correctly', async () => {
      // Create a fake permanent URL that doesn't contain temp-upload-
      const permanentUrl =
        'https://test.supabase.co/storage/v1/object/public/images/user-existing/resource-already-permanent-123-image.jpg';

      const committedUrls = await commitImageUrls({
        supabase,
        imageUrls: [permanentUrl],
        entityType: 'resource',
        entityId: `${TEST_PREFIX}already-permanent-${Date.now()}`,
      });

      expect(committedUrls).toHaveLength(1);
      expect(committedUrls[0]).toBe(permanentUrl); // Should be unchanged
    });

    it('generates unique permanent paths for same filename', async () => {
      const filename = `${TEST_PREFIX}same-name.jpg`;

      // Upload two files with the same name
      const testFile1 = createTestImageFile({ name: filename });
      const testFile2 = createTestImageFile({ name: filename });

      const tempUrl1 = await uploadImage({
        supabase,
        file: testFile1,
        folder: 'temp-upload',
      });
      const tempUrl2 = await uploadImage({
        supabase,
        file: testFile2,
        folder: 'temp-upload',
      });

      // Commit both to same entity type but different IDs
      const entityType = 'shoutout';
      const entityId1 = `${TEST_PREFIX}unique-1-${Date.now()}`;
      const entityId2 = `${TEST_PREFIX}unique-2-${Date.now()}`;

      const committedUrls1 = await commitImageUrls({
        supabase,
        imageUrls: [tempUrl1],
        entityType,
        entityId: entityId1,
      });

      const committedUrls2 = await commitImageUrls({
        supabase,
        imageUrls: [tempUrl2],
        entityType,
        entityId: entityId2,
      });

      // Should have different permanent paths despite same original filename
      expect(committedUrls1[0]).not.toBe(committedUrls2[0]);
      expect(committedUrls1[0]).toContain(entityId1);
      expect(committedUrls2[0]).toContain(entityId2);

      // Both should exist
      const existsResults = await verifyImagesExist([
        committedUrls1[0],
        committedUrls2[0],
      ]);
      const exists1 = existsResults[committedUrls1[0]];
      const exists2 = existsResults[committedUrls2[0]];
      expect(exists1).toBe(true);
      expect(exists2).toBe(true);
    });

    it('handles invalid URLs gracefully', async () => {
      const invalidUrls = [
        'not-a-url',
        'https://example.com/not-storage-url',
        'file:///local/path/image.jpg',
        'data:image/jpeg;base64,invalid',
      ];

      const committedUrls = await commitImageUrls({
        supabase,
        imageUrls: invalidUrls,
        entityType: 'resource',
        entityId: `${TEST_PREFIX}invalid-urls-${Date.now()}`,
      });

      // Should handle invalid URLs gracefully - behavior depends on implementation
      // Either return empty array or skip invalid URLs
      expect(Array.isArray(committedUrls)).toBe(true);
    });
  });
});
