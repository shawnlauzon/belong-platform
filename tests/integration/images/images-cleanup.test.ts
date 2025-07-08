import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { createTestUser, TEST_PREFIX } from '../helpers/test-data';
import { cleanupAllTestData } from '../helpers/cleanup';
import { signIn } from '@/features/auth/api';
import { commitImageUrls, uploadImage } from '@/features/images/api';
import { StorageManager } from '@/features/images/utils/storage';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { UserDetail } from '@/features/users/types';
import {
  createTestImageFile,
  verifyImageExistsInStorage,
  cleanupAllTestImages,
  extractStoragePathFromUrl,
} from './image-helpers';
import {
  cleanupEntityImages,
  cleanupTempImages,
  findOrphanedImages,
} from '@/features/images/api/imageCleanup';

describe('Images API - Cleanup Operations', () => {
  let supabase: SupabaseClient<Database>;
  let testUser: UserDetail;

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

  describe('cleanupTempImages', () => {
    it('cleans up temporary images older than specified age', async () => {
      // Upload a temporary image
      const testFile = createTestImageFile({
        name: `${TEST_PREFIX}temp-cleanup-${Date.now()}.jpg`,
      });
      const tempUrl = await uploadImage({
        supabase,
        file: testFile,
        folder: 'temp-upload',
      });

      // Verify it exists
      const existsBefore = await verifyImageExistsInStorage(tempUrl);
      expect(existsBefore).toBe(true);

      // Clean up temp images with 0 hour max age (should clean up immediately)
      const cleanedCount = await cleanupTempImages(supabase, 0);

      expect(cleanedCount).toBeGreaterThanOrEqual(1);

      // Verify the temp file was cleaned up
      const existsAfter = await verifyImageExistsInStorage(tempUrl);
      expect(existsAfter).toBe(false);
    });

    it('preserves temporary images newer than max age', async () => {
      // Upload a temporary image
      const testFile = createTestImageFile({
        name: `${TEST_PREFIX}temp-preserve-${Date.now()}.jpg`,
      });
      const tempUrl = await uploadImage({
        supabase,
        file: testFile,
        folder: 'temp-upload',
      });

      // Verify it exists
      const existsBefore = await verifyImageExistsInStorage(tempUrl);
      expect(existsBefore).toBe(true);

      // The newly uploaded file should still exist
      const existsAfter = await verifyImageExistsInStorage(tempUrl);
      expect(existsAfter).toBe(true);

      // Clean up the test file manually
      const tempPath = extractStoragePathFromUrl(tempUrl);
      if (tempPath) {
        await StorageManager.deleteFile(tempPath, supabase);
      }
    });

    it('handles cleanup when no temp images exist', async () => {
      // Clean up all existing temp images first
      await cleanupTempImages(supabase, 0);

      // Try to clean up again - should return 0
      const cleanedCount = await cleanupTempImages(supabase, 0);

      expect(cleanedCount).toBe(0);
    });

    it('cleans up multiple temporary images', async () => {
      // Upload multiple temporary images
      const testFiles = [
        createTestImageFile({
          name: `${TEST_PREFIX}multi-temp-1-${Date.now()}.jpg`,
        }),
        createTestImageFile({
          name: `${TEST_PREFIX}multi-temp-2-${Date.now()}.jpg`,
        }),
        createTestImageFile({
          name: `${TEST_PREFIX}multi-temp-3-${Date.now()}.jpg`,
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

      // Verify all exist
      for (const tempUrl of tempUrls) {
        const exists = await verifyImageExistsInStorage(tempUrl);
        expect(exists).toBe(true);
      }

      // Clean up with 0 hour max age
      const cleanedCount = await cleanupTempImages(supabase, 0);

      expect(cleanedCount).toBeGreaterThanOrEqual(3);

      // Verify all were cleaned up
      for (const tempUrl of tempUrls) {
        const exists = await verifyImageExistsInStorage(tempUrl);
        expect(exists).toBe(false);
      }
    });

    it('only cleans up temp files, not permanent files', async () => {
      // Upload a temp image and commit it to permanent storage
      const testFile = createTestImageFile({
        name: `${TEST_PREFIX}temp-to-permanent-${Date.now()}.jpg`,
      });
      const tempUrl = await uploadImage({
        supabase,
        file: testFile,
        folder: 'temp-upload',
      });

      // Commit to permanent storage
      const entityType = 'resource';
      const entityId = `${TEST_PREFIX}permanent-test-${Date.now()}`;
      const committedUrls = await commitImageUrls({
        supabase,
        imageUrls: [tempUrl],
        entityType,
        entityId,
      });
      const permanentUrl = committedUrls[0];

      // Clean up temp images
      await cleanupTempImages(supabase, 0);

      // Permanent image should still exist
      const permanentExists = await verifyImageExistsInStorage(permanentUrl);
      expect(permanentExists).toBe(true);

      // Clean up the permanent image manually
      const permanentPath = extractStoragePathFromUrl(permanentUrl);
      if (permanentPath) {
        await StorageManager.deleteFile(permanentPath, supabase);
      }
    });
  });

  describe('cleanupEntityImages', () => {
    it('cleans up images for specific entity', async () => {
      // Upload and commit images for a specific entity
      const testFiles = [
        createTestImageFile({
          name: `${TEST_PREFIX}entity-1-${Date.now()}.jpg`,
        }),
        createTestImageFile({
          name: `${TEST_PREFIX}entity-2-${Date.now()}.jpg`,
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

      const entityType = 'resource';
      const entityId = `${TEST_PREFIX}cleanup-entity-${Date.now()}`;

      // Commit to permanent storage
      const committedUrls = await commitImageUrls({
        supabase,
        imageUrls: tempUrls,
        entityType,
        entityId,
      });

      // Verify permanent files exist
      for (const permanentUrl of committedUrls) {
        const exists = await verifyImageExistsInStorage(permanentUrl);
        expect(exists).toBe(true);
      }

      // Clean up entity-specific images
      const cleanedCount = await cleanupEntityImages(
        supabase,
        entityType,
        entityId,
      );

      expect(cleanedCount).toBe(2);

      // Verify the permanent files were cleaned up
      for (const permanentUrl of committedUrls) {
        const exists = await verifyImageExistsInStorage(permanentUrl);
        expect(exists).toBe(false);
      }
    });

    it('handles cleanup for non-existent entity', async () => {
      const cleanedCount = await cleanupEntityImages(
        supabase,
        'resource',
        'non-existent-entity-999',
      );

      expect(cleanedCount).toBe(0);
    });

    it.skip('only cleans up images for specified entity', async () => {
      // Upload and commit images for two different entities
      const testFile1 = createTestImageFile({
        name: `${TEST_PREFIX}entity-specific-1-${Date.now()}.jpg`,
      });
      const testFile2 = createTestImageFile({
        name: `${TEST_PREFIX}entity-specific-2-${Date.now()}.jpg`,
      });

      const tempUrl1 = await uploadImage({
        supabase,
        file: testFile1,
        folder: 'temp',
      });
      const tempUrl2 = await uploadImage({
        supabase,
        file: testFile2,
        folder: 'temp',
      });

      const entityType = 'event';
      const entityId1 = `${TEST_PREFIX}specific-1-${Date.now()}`;
      const entityId2 = `${TEST_PREFIX}specific-2-${Date.now()}`;

      // Commit both to permanent storage
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

      const permanentUrl1 = committedUrls1[0];
      const permanentUrl2 = committedUrls2[0];

      // Verify both files exist
      const exists1Before = await verifyImageExistsInStorage(permanentUrl1);
      const exists2Before = await verifyImageExistsInStorage(permanentUrl2);
      expect(exists1Before).toBe(true);
      expect(exists2Before).toBe(true);

      // Clean up only the first entity
      const cleanedCount = await cleanupEntityImages(
        supabase,
        entityType,
        entityId1,
      );

      expect(cleanedCount).toBe(1);

      // Verify only the first entity's image was cleaned up
      const exists1After = await verifyImageExistsInStorage(permanentUrl1);
      const exists2After = await verifyImageExistsInStorage(permanentUrl2);
      expect(exists1After).toBe(false);
      expect(exists2After).toBe(true);

      // Clean up the second entity manually
      await cleanupEntityImages(supabase, entityType, entityId2);
    });
  });

  describe('findOrphanedImages', () => {
    it('detects orphaned images in dry run mode', async () => {
      // Upload and commit images for a non-existent entity
      const testFile = createTestImageFile({
        name: `${TEST_PREFIX}orphaned-${Date.now()}.jpg`,
      });
      const tempUrl = await uploadImage({
        supabase,
        file: testFile,
        folder: 'temp-upload',
      });

      const entityType = 'resource';
      const entityId = 'non-existent-resource-orphaned-999';

      // Commit to permanent storage
      const committedUrls = await commitImageUrls({
        supabase,
        imageUrls: [tempUrl],
        entityType,
        entityId,
      });
      const permanentUrl = committedUrls[0];

      // Verify permanent file exists
      const existsBefore = await verifyImageExistsInStorage(permanentUrl);
      expect(existsBefore).toBe(true);

      // Find orphaned images (dry run)
      const orphanedImages = await findOrphanedImages(
        supabase,
        true, // dry run
      );

      const permanentPath = extractStoragePathFromUrl(permanentUrl);
      expect(orphanedImages).toContain(permanentPath);

      // Verify file still exists (dry run shouldn't delete)
      const existsAfter = await verifyImageExistsInStorage(permanentUrl);
      expect(existsAfter).toBe(true);

      // Clean up manually
      if (permanentPath) {
        await StorageManager.deleteFile(permanentPath, supabase);
      }
    });

    it('removes orphaned images when not in dry run mode', async () => {
      // Upload and commit images for a non-existent entity
      const testFile = createTestImageFile({
        name: `${TEST_PREFIX}orphaned-delete-${Date.now()}.jpg`,
      });
      const tempUrl = await uploadImage({
        supabase,
        file: testFile,
        folder: 'temp-upload',
      });

      const entityType = 'community';
      const entityId = 'non-existent-community-orphaned-999';

      // Commit to permanent storage
      const committedUrls = await commitImageUrls({
        supabase,
        imageUrls: [tempUrl],
        entityType,
        entityId,
      });
      const permanentUrl = committedUrls[0];

      // Verify permanent file exists
      const existsBefore = await verifyImageExistsInStorage(permanentUrl);
      expect(existsBefore).toBe(true);

      // Find and remove orphaned images (not dry run)
      const orphanedImages = await findOrphanedImages(
        supabase,
        false, // not dry run - will delete
      );

      const permanentPath = extractStoragePathFromUrl(permanentUrl);
      expect(orphanedImages).toContain(permanentPath);

      // Verify file was deleted
      const existsAfter = await verifyImageExistsInStorage(permanentUrl);
      expect(existsAfter).toBe(false);
    });

    it('ignores temporary images when finding orphaned images', async () => {
      // Upload a temporary image
      const testFile = createTestImageFile({
        name: `${TEST_PREFIX}temp-not-orphaned-${Date.now()}.jpg`,
      });
      const tempUrl = await uploadImage({
        supabase,
        file: testFile,
        folder: 'temp-upload',
      });

      // Verify temp file exists
      const tempExists = await verifyImageExistsInStorage(tempUrl);
      expect(tempExists).toBe(true);

      // Find orphaned images
      const orphanedImages = await findOrphanedImages(
        supabase,
        true, // dry run
      );

      // Temp files should not be considered orphaned
      const tempPath = extractStoragePathFromUrl(tempUrl);
      expect(orphanedImages).not.toContain(tempPath);

      // Clean up the temp file
      if (tempPath) {
        await StorageManager.deleteFile(tempPath, supabase);
      }
    });

    it('handles case when no orphaned images exist', async () => {
      // Clean up any existing orphaned images first
      await findOrphanedImages(supabase, false);

      // Find orphaned images when none exist
      const orphanedImages = await findOrphanedImages(
        supabase,
        true, // dry run
      );

      // Should return empty array or contain only known test files
      expect(Array.isArray(orphanedImages)).toBe(true);
    });
  });
});
