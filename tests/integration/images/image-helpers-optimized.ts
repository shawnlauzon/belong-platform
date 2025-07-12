import { createServiceClient } from '../helpers/test-client';
import { TEST_PREFIX } from '../helpers/test-data';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

/**
 * Creates a minimal test image file optimized for speed
 */
export function createTestImageFile(
  options: {
    name?: string;
    size?: number;
  } = {},
): File {
  const {
    name = `${TEST_PREFIX}fast-${Date.now()}.jpg`,
    size = 256, // Minimal size for faster upload
  } = options;

  // Minimal valid JPEG header (smallest possible)
  const jpegHeader = new Uint8Array([
    0xff,
    0xd8, // SOI
    0xff,
    0xd9, // EOI
  ]);

  // Create minimal buffer
  const buffer = new Uint8Array(Math.max(size, jpegHeader.length));
  buffer.set(jpegHeader);

  // Fill rest with zeros (faster than random)
  buffer.fill(0, jpegHeader.length);

  return new File([buffer], name, { type: 'image/jpeg' });
}

/**
 * Batch upload multiple images in parallel with optimized settings
 */
export async function batchUploadImages(
  supabase: SupabaseClient<Database>,
  count: number,
  folder: string = 'temp-upload',
): Promise<string[]> {
  const files = Array.from({ length: count }, (_, i) =>
    createTestImageFile({
      name: `${TEST_PREFIX}batch-${i}-${Date.now()}.jpg`,
    }),
  );

  // Use dynamic import to avoid bundling issues
  const { uploadImage } = await import('@/features/images/api');

  // Upload sequentially to avoid overwhelming the API and auth issues
  const urls: string[] = [];
  for (const file of files) {
    try {
      const url = await uploadImage({ supabase, file, folder });
      urls.push(url);
    } catch (error) {
      console.warn('Upload failed for file:', file.name, error);
      // Continue with other uploads
    }
  }

  return urls;
}

/**
 * Fast batch verification using storage list API
 */
export async function verifyImagesExist(
  imageUrls?: string[],
): Promise<Record<string, boolean>> {
  const serviceClient = createServiceClient();
  const results: Record<string, boolean> = {};

  if (!imageUrls || imageUrls.length === 0) {
    return results;
  }

  // Group by user folder for efficient batch checking
  const urlsByUser: Record<string, { url: string; filename: string }[]> = {};

  for (const url of imageUrls) {
    const path = extractStoragePathFromUrl(url);
    if (!path) {
      results[url] = false;
      continue;
    }

    const [userId, filename] = path.split('/');
    if (!filename) {
      results[url] = false;
      continue;
    }

    if (!urlsByUser[userId]) {
      urlsByUser[userId] = [];
    }
    urlsByUser[userId].push({ url, filename });
  }

  // Check each user folder in parallel
  const userChecks = Object.entries(urlsByUser).map(
    async ([userId, urlData]) => {
      try {
        const { data: files } = await serviceClient.storage
          .from('images')
          .list(userId, {
            limit: 1000,
            sortBy: { column: 'name', order: 'asc' },
          });

        const existingFiles = new Set(files?.map((f) => f.name) || []);

        for (const { url, filename } of urlData) {
          results[url] = existingFiles.has(filename);
        }
      } catch (error) {
        console.warn(`Error checking files for user ${userId}:`, error);
        // On error, mark all as not existing
        for (const { url } of urlData) {
          results[url] = false;
        }
      }
    },
  );

  await Promise.all(userChecks);
  return results;
}

/**
 * Optimized storage path extraction
 */
export function extractStoragePathFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');

    // Find 'images' bucket index
    const imagesIndex = pathParts.findIndex((part) => part === 'images');
    if (imagesIndex === -1 || imagesIndex >= pathParts.length - 1) {
      return null;
    }

    // Return path after 'images' bucket
    return pathParts.slice(imagesIndex + 1).join('/');
  } catch {
    return null;
  }
}

/**
 * Fast cleanup with minimal API calls
 */
export async function cleanupTestImages(imagePaths: string[]): Promise<number> {
  if (imagePaths.length === 0) {
    return 0;
  }

  const serviceClient = createServiceClient();

  try {
    // Batch delete all paths at once
    const { error } = await serviceClient.storage
      .from('images')
      .remove(imagePaths);

    if (error) {
      console.warn('Error during fast cleanup:', error);
      return 0;
    }

    return imagePaths.length;
  } catch (error) {
    console.warn('Error during fast cleanup:', error);
    return 0;
  }
}

/**
 * Optimized cleanup of all test images using pattern matching
 */
export async function cleanupAllTestImages(): Promise<number> {
  const serviceClient = createServiceClient();
  let totalCleaned = 0;

  try {
    // Get all user folders
    const { data: folders } = await serviceClient.storage
      .from('images')
      .list('', { limit: 1000 });

    if (!folders) {
      return 0;
    }

    // Process folders in parallel batches to avoid overwhelming the API
    const batchSize = 5;
    const folderBatches = [];

    for (let i = 0; i < folders.length; i += batchSize) {
      folderBatches.push(folders.slice(i, i + batchSize));
    }

    for (const batch of folderBatches) {
      const batchPromises = batch
        .filter((f) => f.id === null) // Only folders
        .map(async (folder) => {
          const { data: files } = await serviceClient.storage
            .from('images')
            .list(folder.name, { limit: 1000 });

          if (!files) return 0;

          // Filter test files efficiently
          const testFiles = files.filter(
            (file) =>
              file.name.includes(TEST_PREFIX) ||
              file.name.includes('temp-upload-') ||
              file.name.includes('batch-') ||
              file.name.includes('fast-'),
          );

          if (testFiles.length === 0) return 0;

          // Delete in batch
          const filePaths = testFiles.map(
            (file) => `${folder.name}/${file.name}`,
          );
          const { error } = await serviceClient.storage
            .from('images')
            .remove(filePaths);

          if (error) {
            console.warn(`Error cleaning folder ${folder.name}:`, error);
            return 0;
          }

          return testFiles.length;
        });

      const batchResults = await Promise.all(batchPromises);
      totalCleaned += batchResults.reduce((sum, count) => sum + count, 0);
    }

    return totalCleaned;
  } catch (error) {
    console.warn('Error during optimized cleanup:', error);
    return totalCleaned;
  }
}
