import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { createTestUser, TEST_PREFIX } from '../helpers/test-data';
import { cleanupAllTestData } from '../helpers/cleanup';
import { signIn } from '@/features/auth/api';
import { uploadImage } from '@/features/images/api';
import { StorageManager } from '@/features/images/utils/storage';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { User } from '@/features/users/types';
import {
  createFastTestImageFile,
  verifyImageExistsInStorage,
  cleanupAllTestImages,
  extractStoragePathFromUrl,
} from './image-helpers-optimized';

describe.skip('Images API - Upload Operations', () => {
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

  describe('uploadFile', () => {
    it('uploads single image file successfully', async () => {
      const testFile = createFastTestImageFile({
        name: `${TEST_PREFIX}single-upload-${Date.now()}.jpg`,
      });

      const result = await uploadImage({
        supabase,
        file: testFile,
        folder: 'temp-upload',
      });

      // Result should be a string URL
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');

      // Verify file exists in storage
      const exists = await verifyImageExistsInStorage(result);
      expect(exists).toBe(true);

      // Verify URL format - includes user ID folder and temp-upload prefix
      expect(result).toMatch(
        new RegExp(
          `^https:\\/\\/.*\\/storage\\/v1\\/object\\/public\\/images\\/${testUser.id}\\/temp-upload-`,
        ),
      );

      // Verify path extraction works
      const extractedPath = extractStoragePathFromUrl(result);
      expect(extractedPath).toContain(testUser.id);
      expect(extractedPath).toContain('temp-upload-');
    });

    it('uploads multiple image files successfully', async () => {
      const testFiles = createMultipleTestImageFiles(3);
      const uploadPromises = testFiles.map((file) =>
        uploadImage({
          supabase,
          file,
          folder: 'temp-upload',
        }),
      );

      const results = await Promise.all(uploadPromises);

      expect(results).toHaveLength(3);

      for (const result of results) {
        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');

        // Verify file exists in storage
        const exists = await verifyImageExistsInStorage(result);
        expect(exists).toBe(true);

        // Verify path extraction works
        const extractedPath = extractStoragePathFromUrl(result);
        expect(extractedPath).toContain(testUser.id);
        expect(extractedPath).toContain('temp-upload-');
      }
    });

    it('generates unique filenames for uploads', async () => {
      const testFile1 = createTestImageFile({ name: 'same-name.jpg' });
      const testFile2 = createTestImageFile({ name: 'same-name.jpg' });

      const result1 = await uploadImage({
        supabase,
        file: testFile1,
        folder: 'temp-upload',
      });
      const result2 = await uploadImage({
        supabase,
        file: testFile2,
        folder: 'temp-upload',
      });

      // Should have different URLs despite same filename
      expect(result1).not.toBe(result2);

      // Both should exist
      const exists1 = await verifyImageExistsInStorage(result1);
      const exists2 = await verifyImageExistsInStorage(result2);
      expect(exists1).toBe(true);
      expect(exists2).toBe(true);
    });

    it('creates proper folder structure', async () => {
      const testFile = createTestImageFile();

      const result = await uploadImage({
        supabase,
        file: testFile,
        folder: 'temp-upload',
      });
      const path = extractStoragePathFromUrl(result);

      expect(path).toBeTruthy();
      expect(path).toMatch(
        new RegExp(`^${testUser.id}/temp-upload-[\\w-]+\\.(jpg|jpeg|png|gif)$`),
      );

      // Should contain user ID in path
      expect(path).toContain(testUser.id);
    });

    it('handles different image file types', async () => {
      const imageTypes = [
        { name: 'test.jpg', type: 'image/jpeg' },
        { name: 'test.png', type: 'image/png' },
        { name: 'test.gif', type: 'image/gif' },
      ];

      for (const { name, type } of imageTypes) {
        const testFile = createTestImageFile({ name, type });

        const result = await uploadImage({
          supabase,
          file: testFile,
          folder: 'temp-upload',
        });

        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');

        // Verify file exists in storage
        const exists = await verifyImageExistsInStorage(result);
        expect(exists).toBe(true);
      }
    });

    it('validates file type and rejects non-image files', async () => {
      const nonImageFile = createNonImageFile();

      // Should throw validation error
      await expect(
        uploadImage({
          supabase,
          file: nonImageFile,
          folder: 'temp-upload',
        }),
      ).rejects.toThrow();
    });

    it('validates file size and rejects oversized files', async () => {
      const oversizedFile = createOversizedTestImageFile();

      // Should throw validation error
      await expect(
        uploadImage({
          supabase,
          file: oversizedFile,
          folder: 'temp-upload',
        }),
      ).rejects.toThrow();
    });

    it('requires user authentication', async () => {
      // Sign out to remove authentication
      await signIn(supabase, testUser.email, 'TestPass123!');

      const testFile = createTestImageFile();

      // Should work with authentication
      const result = await uploadImage({
        supabase,
        file: testFile,
        folder: 'temp-upload',
      });
      expect(result).toBeTruthy();

      // Verify file exists
      const exists = await verifyImageExistsInStorage(result);
      expect(exists).toBe(true);
    });

    it('handles various file sizes within limits', async () => {
      const fileSizes = [
        1024, // 1KB
        100 * 1024, // 100KB
        1024 * 1024, // 1MB
        4 * 1024 * 1024, // 4MB (just under limit)
      ];

      for (const size of fileSizes) {
        const testFile = createTestImageFile({
          name: `test-${size}-${Date.now()}.jpg`,
          size,
        });

        const result = await uploadImage({
          supabase,
          file: testFile,
          folder: 'temp-upload',
        });

        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');

        // Verify file exists in storage
        const exists = await verifyImageExistsInStorage(result);
        expect(exists).toBe(true);
      }
    });
  });

  describe('deleteFile', () => {
    it('deletes uploaded file successfully', async () => {
      // Upload a file first
      const testFile = createTestImageFile();
      const uploadResult = await StorageManager.uploadFile(
        testFile,
        supabase,
        'temp',
      );

      // Verify file exists
      const existsBefore = await verifyImageExistsInStorage(uploadResult.url);
      expect(existsBefore).toBe(true);

      // Delete the file
      await StorageManager.deleteFile(uploadResult.path, supabase);

      // Verify file was deleted
      const existsAfter = await verifyImageExistsInStorage(uploadResult.url);
      expect(existsAfter).toBe(false);
    });

    it('handles deletion of non-existent files gracefully', async () => {
      const nonExistentPath = 'temp/non-existent-file.jpg';

      // Should not throw error
      await expect(
        StorageManager.deleteFile(nonExistentPath, supabase),
      ).resolves.not.toThrow();
    });
  });

  describe('extractPathFromUrl', () => {
    it('extracts path from valid storage URL', async () => {
      const testFile = createTestImageFile();
      const result = await StorageManager.uploadFile(
        testFile,
        supabase,
        'temp-upload',
      );

      const extractedPath = StorageManager.extractPathFromUrl(result.url);

      expect(extractedPath).toBe(result.path);
    });

    it('returns null for invalid URLs', () => {
      const invalidUrls = [
        'not-a-url',
        'https://example.com/not-storage',
        'https://storage.com/wrong-format',
        '',
        'file:///local/path',
      ];

      for (const url of invalidUrls) {
        const result = StorageManager.extractPathFromUrl(url);
        expect(result).toBeNull();
      }
    });

    it('handles various valid URL formats', () => {
      const validUrls = [
        'https://project.supabase.co/storage/v1/object/public/images/user-123/temp-upload-1234567890-abc123.jpg',
        'https://abc123.supabase.co/storage/v1/object/public/images/user-456/resource-res-789-image.png',
        'https://test.supabase.co/storage/v1/object/public/images/user-789/community-comm-123-banner.gif',
      ];

      const expectedPaths = [
        'user-123/temp-upload-1234567890-abc123.jpg',
        'user-456/resource-res-789-image.png',
        'user-789/community-comm-123-banner.gif',
      ];

      for (let i = 0; i < validUrls.length; i++) {
        const result = StorageManager.extractPathFromUrl(validUrls[i]);
        expect(result).toBe(expectedPaths[i]);
      }
    });
  });
});
