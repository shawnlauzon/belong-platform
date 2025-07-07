import { faker } from '@faker-js/faker';
import { createServiceClient } from '../helpers/test-client';
import { TEST_PREFIX } from '../helpers/test-data';

/**
 * Creates a test image file for integration testing
 * @param options - Options for creating the image file
 * @returns File object with image data
 */
export function createTestImageFile(options: {
  name?: string;
  size?: number;
  type?: string;
} = {}): File {
  const {
    name = `${TEST_PREFIX}test-image-${Date.now()}.jpg`,
    size = 1024, // 1KB by default
    type = 'image/jpeg',
  } = options;

  // Create a minimal valid JPEG file header
  const jpegHeader = new Uint8Array([
    0xff, 0xd8, 0xff, 0xe0, // JPEG SOI and APP0 markers
    0x00, 0x10, // APP0 length
    0x4a, 0x46, 0x49, 0x46, 0x00, // "JFIF" identifier
    0x01, 0x01, // Version 1.1
    0x00, 0x00, 0x01, 0x00, 0x01, // Aspect ratio and thumbnail
    0x00, 0x00, // No thumbnail
    0xff, 0xd9, // JPEG EOI marker
  ]);

  // Pad to requested size
  const totalSize = Math.max(size, jpegHeader.length);
  const buffer = new Uint8Array(totalSize);
  buffer.set(jpegHeader);
  
  // Fill rest with random data
  for (let i = jpegHeader.length; i < totalSize; i++) {
    buffer[i] = Math.floor(Math.random() * 256);
  }

  return new File([buffer], name, { type });
}

/**
 * Creates a test image file that exceeds the size limit
 * @returns File object that's too large
 */
export function createOversizedTestImageFile(): File {
  const size = 6 * 1024 * 1024; // 6MB - exceeds 5MB limit
  return createTestImageFile({
    name: `${TEST_PREFIX}oversized-image-${Date.now()}.jpg`,
    size,
  });
}

/**
 * Creates a test file that's not an image
 * @returns File object with non-image content
 */
export function createNonImageFile(): File {
  const content = 'This is not an image file';
  return new File([content], `${TEST_PREFIX}not-image-${Date.now()}.txt`, {
    type: 'text/plain',
  });
}

/**
 * Creates multiple test image files
 * @param count - Number of files to create
 * @returns Array of File objects
 */
export function createMultipleTestImageFiles(count: number): File[] {
  return Array.from({ length: count }, (_, i) =>
    createTestImageFile({
      name: `${TEST_PREFIX}multi-image-${i + 1}-${Date.now()}.jpg`,
    })
  );
}

/**
 * Extracts the storage path from a Supabase storage URL
 * @param url - Supabase storage URL
 * @returns Storage path or null if invalid
 */
export function extractStoragePathFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    
    // Find the index of 'images' bucket
    const imagesIndex = pathParts.findIndex(part => part === 'images');
    if (imagesIndex === -1 || imagesIndex === pathParts.length - 1) {
      return null;
    }
    
    // Return the path after 'images' - now in format: {userId}/{filename}
    return pathParts.slice(imagesIndex + 1).join('/');
  } catch {
    return null;
  }
}

/**
 * Verifies that an image file exists in Supabase storage
 * @param imageUrl - URL of the image to verify
 * @returns Promise<boolean> - True if file exists
 */
export async function verifyImageExistsInStorage(imageUrl: string): Promise<boolean> {
  const serviceClient = createServiceClient();
  
  const path = extractStoragePathFromUrl(imageUrl);
  if (!path) {
    return false;
  }

  try {
    // New format: {userId}/{filename}
    const pathParts = path.split('/');
    if (pathParts.length !== 2) {
      return false;
    }
    
    const [userId, filename] = pathParts;
    
    const { data, error } = await serviceClient.storage
      .from('images')
      .list(userId, {
        search: filename,
      });

    if (error) {
      console.warn('Error checking file existence:', error);
      return false;
    }

    return data?.length > 0;
  } catch (error) {
    console.warn('Error verifying image existence:', error);
    return false;
  }
}

/**
 * Cleans up test images from storage
 * @param imageUrls - Array of image URLs to clean up
 * @returns Promise<number> - Number of files cleaned up
 */
export async function cleanupTestImages(imageUrls: string[]): Promise<number> {
  if (!imageUrls || imageUrls.length === 0) {
    return 0;
  }

  const serviceClient = createServiceClient();
  const paths = imageUrls
    .map(url => extractStoragePathFromUrl(url))
    .filter((path): path is string => path !== null);

  if (paths.length === 0) {
    return 0;
  }

  try {
    const { error } = await serviceClient.storage
      .from('images')
      .remove(paths);

    if (error) {
      console.warn('Error cleaning up test images:', error);
      return 0;
    }

    return paths.length;
  } catch (error) {
    console.warn('Error during image cleanup:', error);
    return 0;
  }
}

/**
 * Cleans up all test images from storage (for afterAll)
 * @returns Promise<number> - Number of files cleaned up
 */
export async function cleanupAllTestImages(): Promise<number> {
  const serviceClient = createServiceClient();

  try {
    // List all user folders first
    const { data: folders, error } = await serviceClient.storage
      .from('images')
      .list('', {
        limit: 1000,
      });

    if (error) {
      console.warn('Error listing folders for cleanup:', error);
      return 0;
    }

    if (!folders || folders.length === 0) {
      return 0;
    }

    let totalCleanedFiles = 0;

    // Check each user folder for test files
    for (const folder of folders.filter(f => f.id === null)) { // Folders have null id
      const { data: userFiles } = await serviceClient.storage
        .from('images')
        .list(folder.name, {
          limit: 1000,
        });

      if (!userFiles || userFiles.length === 0) {
        continue;
      }

      // Filter for test files (files containing TEST_PREFIX or temp-upload)
      const testFiles = userFiles.filter(file => 
        file.name.includes(TEST_PREFIX) ||
        file.name.includes('temp-upload-') // Clean up any temp files
      );

      if (testFiles.length === 0) {
        continue;
      }

      // Delete test files with full paths
      const filePaths = testFiles.map(file => `${folder.name}/${file.name}`);
      const { error: deleteError } = await serviceClient.storage
        .from('images')
        .remove(filePaths);

      if (deleteError) {
        console.warn('Error deleting test images in folder:', folder.name, deleteError);
        continue;
      }

      totalCleanedFiles += testFiles.length;
    }

    return totalCleanedFiles;
  } catch (error) {
    console.warn('Error during comprehensive image cleanup:', error);
    return 0;
  }
}

/**
 * Generates test image URLs for testing commit functionality
 * @param count - Number of URLs to generate
 * @param userId - User ID for temp paths
 * @returns Array of temporary image URLs
 */
export function generateTestImageUrls(count: number, userId: string): string[] {
  return Array.from({ length: count }, (_, i) => {
    const filename = `temp-upload-${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`;
    return `https://test.supabase.co/storage/v1/object/public/images/${userId}/${filename}`;
  });
}