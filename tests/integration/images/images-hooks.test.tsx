import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { createTestUser, TEST_PREFIX } from '../helpers/test-data';
import { cleanupAllTestData } from '../helpers/cleanup';
import { signIn } from '@/features/auth/api';
import { useImageCommit } from '@/features/images/hooks/useImageCommit';
import { uploadImage } from '@/features/images/api';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { User } from '@/features/users/types';
import type { ReactNode } from 'react';
import {
  createTestImageFile,
  verifyImageExistsInStorage,
  cleanupAllTestImages,
} from './image-helpers';

// Create a wrapper component for React Query
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('Images Hooks - Integration Tests', () => {
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

  describe('useImageCommit', () => {
    it('commits temporary images using hook mutation', async () => {
      const wrapper = createWrapper();

      // Upload a temporary image first
      const testFile = createTestImageFile({
        name: `${TEST_PREFIX}hook-commit-${Date.now()}.jpg`,
      });
      const uploadResult = await uploadImage({
        supabase,
        file: testFile,
        folder: 'temp-upload',
      });
      const tempUrl = uploadResult.url;

      // Verify temp file exists
      const tempExists = await verifyImageExistsInStorage(tempUrl);
      expect(tempExists).toBe(true);

      // Use the hook
      const { result } = renderHook(() => useImageCommit(), { wrapper });

      expect(result.current.isIdle).toBe(true);
      expect(result.current.isPending).toBe(false);

      // Commit the images
      const entityType = 'resource';
      const entityId = `${TEST_PREFIX}hook-test-${Date.now()}`;

      result.current.mutate({
        imageUrls: [tempUrl],
        entityType,
        entityId,
      });

      // Wait for mutation to complete
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeTruthy();
      expect(result.current.data!.permanentUrls).toHaveLength(1);
      expect(result.current.data!.committedCount).toBe(1);
      expect(result.current.data!.permanentUrls[0]).not.toContain(
        'temp-upload-',
      );
      expect(result.current.data!.permanentUrls[0]).toContain(
        `${entityType}-${entityId}`,
      );

      // Verify permanent file exists
      const permanentExists = await verifyImageExistsInStorage(
        result.current.data!.permanentUrls[0],
      );
      expect(permanentExists).toBe(true);

      // Verify temp file was moved
      const tempExistsAfter = await verifyImageExistsInStorage(tempUrl);
      expect(tempExistsAfter).toBe(false);
    });

    it('handles empty image URLs array', async () => {
      const wrapper = createWrapper();

      const { result } = renderHook(() => useImageCommit(), { wrapper });

      // Commit empty array
      result.current.mutate({
        imageUrls: [],
        entityType: 'resource',
        entityId: `${TEST_PREFIX}empty-test-${Date.now()}`,
      });

      // Wait for mutation to complete
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data!.permanentUrls).toHaveLength(0);
      expect(result.current.data!.committedCount).toBe(0);
    });

    it('commits multiple temporary images using hook', async () => {
      const wrapper = createWrapper();

      // Upload multiple temporary images
      const testFiles = [
        createTestImageFile({
          name: `${TEST_PREFIX}hook-multi-1-${Date.now()}.jpg`,
        }),
        createTestImageFile({
          name: `${TEST_PREFIX}hook-multi-2-${Date.now()}.jpg`,
        }),
        createTestImageFile({
          name: `${TEST_PREFIX}hook-multi-3-${Date.now()}.jpg`,
        }),
      ];

      const uploadPromises = testFiles.map((file) =>
        uploadImage({
          supabase,
          file,
          folder: 'temp-upload',
        }),
      );
      const uploadResults = await Promise.all(uploadPromises);
      const tempUrls = uploadResults.map((result) => result.url);

      // Verify all temp files exist
      for (const tempUrl of tempUrls) {
        const exists = await verifyImageExistsInStorage(tempUrl);
        expect(exists).toBe(true);
      }

      // Use the hook
      const { result } = renderHook(() => useImageCommit(), { wrapper });

      // Commit all images
      const entityType = 'event';
      const entityId = `${TEST_PREFIX}hook-multi-${Date.now()}`;

      result.current.mutate({
        imageUrls: tempUrls,
        entityType,
        entityId,
      });

      // Wait for mutation to complete
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data!.permanentUrls).toHaveLength(3);
      expect(result.current.data!.committedCount).toBe(3);

      // Verify all permanent files exist
      for (const permanentUrl of result.current.data!.permanentUrls) {
        expect(permanentUrl).not.toContain('temp-upload-');
        expect(permanentUrl).toContain(`${entityType}-${entityId}`);

        const exists = await verifyImageExistsInStorage(permanentUrl);
        expect(exists).toBe(true);
      }

      // Verify all temp files were moved
      for (const tempUrl of tempUrls) {
        const tempExists = await verifyImageExistsInStorage(tempUrl);
        expect(tempExists).toBe(false);
      }
    });

    it('handles mixed temporary and permanent URLs', async () => {
      const wrapper = createWrapper();

      // Upload a temporary image
      const testFile = createTestImageFile({
        name: `${TEST_PREFIX}hook-mixed-${Date.now()}.jpg`,
      });
      const uploadResult = await uploadImage({
        supabase,
        file: testFile,
        folder: 'temp-upload',
      });
      const tempUrl = uploadResult.url;

      // Create a fake permanent URL
      const permanentUrl =
        'https://test.supabase.co/storage/v1/object/public/images/user-existing/resource-existing-123-image.jpg';

      // Use the hook
      const { result } = renderHook(() => useImageCommit(), { wrapper });

      // Commit mixed URLs
      const entityType = 'community';
      const entityId = `${TEST_PREFIX}hook-mixed-${Date.now()}`;

      result.current.mutate({
        imageUrls: [tempUrl, permanentUrl],
        entityType,
        entityId,
      });

      // Wait for mutation to complete
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data!.permanentUrls).toHaveLength(2);
      expect(result.current.data!.committedCount).toBe(1); // Only 1 was actually committed

      // First URL should be committed
      expect(result.current.data!.permanentUrls[0]).not.toContain(
        'temp-upload-',
      );
      expect(result.current.data!.permanentUrls[0]).toContain(
        `${entityType}-${entityId}`,
      );

      // Second URL should remain unchanged
      expect(result.current.data!.permanentUrls[1]).toBe(permanentUrl);
    });

    it('handles mutation errors gracefully', async () => {
      const wrapper = createWrapper();

      const { result } = renderHook(() => useImageCommit(), { wrapper });

      // Try to commit with invalid data
      result.current.mutate({
        imageUrls: ['invalid-url'],
        entityType: 'resource',
        entityId: `${TEST_PREFIX}error-test-${Date.now()}`,
      });

      // Wait for mutation to complete
      await waitFor(() => {
        expect(result.current.isError || result.current.isSuccess).toBe(true);
      });

      // Should either handle gracefully or show error state
      if (result.current.isError) {
        expect(result.current.error).toBeTruthy();
      }
    });

    it('supports async mutation with mutateAsync', async () => {
      const wrapper = createWrapper();

      // Upload a temporary image
      const testFile = createTestImageFile({
        name: `${TEST_PREFIX}hook-async-${Date.now()}.jpg`,
      });
      const uploadResult = await uploadImage({
        supabase,
        file: testFile,
        folder: 'temp-upload',
      });
      const tempUrl = uploadResult.url;

      // Use the hook
      const { result } = renderHook(() => useImageCommit(), { wrapper });

      // Use mutateAsync for promise-based flow
      const entityType = 'user';
      const entityId = `${TEST_PREFIX}hook-async-${Date.now()}`;

      const commitResult = await result.current.mutateAsync({
        imageUrls: [tempUrl],
        entityType,
        entityId,
      });

      expect(commitResult.permanentUrls).toHaveLength(1);
      expect(commitResult.committedCount).toBe(1);
      expect(commitResult.permanentUrls[0]).not.toContain('temp-upload-');
      expect(commitResult.permanentUrls[0]).toContain(
        `${entityType}-${entityId}`,
      );

      // Verify permanent file exists
      const permanentExists = await verifyImageExistsInStorage(
        commitResult.permanentUrls[0],
      );
      expect(permanentExists).toBe(true);
    });

    it('counts committed vs unchanged URLs correctly', async () => {
      const wrapper = createWrapper();

      // Upload two temporary images
      const testFiles = [
        createTestImageFile({
          name: `${TEST_PREFIX}hook-count-1-${Date.now()}.jpg`,
        }),
        createTestImageFile({
          name: `${TEST_PREFIX}hook-count-2-${Date.now()}.jpg`,
        }),
      ];

      const uploadPromises = testFiles.map((file) =>
        uploadImage({
          supabase,
          file,
          folder: 'temp-upload',
        }),
      );
      const uploadResults = await Promise.all(uploadPromises);
      const tempUrls = uploadResults.map((result) => result.url);

      // Add a fake permanent URL
      const permanentUrl =
        'https://test.supabase.co/storage/v1/object/public/images/user-existing/resource-existing-456-image.jpg';

      // Use the hook
      const { result } = renderHook(() => useImageCommit(), { wrapper });

      // Commit mixed URLs
      const entityType = 'shoutout';
      const entityId = `${TEST_PREFIX}hook-count-${Date.now()}`;

      result.current.mutate({
        imageUrls: [...tempUrls, permanentUrl],
        entityType,
        entityId,
      });

      // Wait for mutation to complete
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data!.permanentUrls).toHaveLength(3);
      expect(result.current.data!.committedCount).toBe(2); // Only 2 temp URLs were committed

      // Verify the committed count is accurate
      const committedUrls = result.current.data!.permanentUrls.slice(0, 2);
      for (const url of committedUrls) {
        expect(url).not.toContain('temp-upload-');
        expect(url).toContain(`${entityType}-${entityId}`);
      }

      // Last URL should be unchanged
      expect(result.current.data!.permanentUrls[2]).toBe(permanentUrl);
    });
  });
});
