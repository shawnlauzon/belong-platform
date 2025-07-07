import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { StorageManager } from '../utils/storage';
import { logger } from '@/shared/logger';
import type { ImageUploadResult } from '../types';

/**
 * Uploads an image file to temporary storage.
 * 
 * This function:
 * 1. Validates the user is authenticated
 * 2. Validates the file is an image and within size limits
 * 3. Uploads to temporary storage with naming convention: {userId}/temp-upload-{timestamp}-{random}.{ext}
 * 4. Returns the public URL and temporary path for later commitment
 * 
 * @param file - Image file to upload
 * @param supabase - Supabase client for storage operations
 * @param folder - Optional folder prefix (defaults to 'temp-upload')
 * @returns Promise<ImageUploadResult> - Upload result with URL and temp path
 * 
 * @example
 * ```typescript
 * // Upload image during form creation
 * const file = new File(['...'], 'image.jpg', { type: 'image/jpeg' });
 * 
 * const result = await uploadImage(file, supabase);
 * 
 * // Use result.url in form, result.tempPath for cleanup
 * console.log('Temp URL:', result.url);
 * // Result: { url: 'https://proj.supabase.co/storage/v1/object/public/images/user-123/temp-upload-1234567890-abc123.jpg', tempPath: 'user-123/temp-upload-1234567890-abc123.jpg' }
 * ```
 */
export async function uploadImage(
  file: File,
  supabase: SupabaseClient<Database>,
  folder: string = 'temp-upload'
): Promise<ImageUploadResult> {
  // Get current user for authentication check
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('User must be authenticated to upload images');
  }

  // Validate file is an image
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are allowed');
  }

  // Validate file size (5MB limit)
  const maxSize = 5 * 1024 * 1024; // 5MB in bytes
  if (file.size > maxSize) {
    throw new Error('File size must be less than 5MB');
  }

  logger.debug('🖼️ Image Upload: Starting upload', {
    fileName: file.name,
    fileSize: file.size,
    userId: user.id,
    folder,
  });

  try {
    // Upload file using StorageManager
    const result = await StorageManager.uploadFile(file, supabase, folder);

    logger.info('✅ Image Upload: Successfully uploaded to temp storage', {
      fileName: file.name,
      tempPath: result.path,
      url: result.url,
      userId: user.id,
    });

    return {
      url: result.url,
      tempPath: result.path,
    };
  } catch (error) {
    logger.error('❌ Image Upload: Failed to upload image', {
      fileName: file.name,
      userId: user.id,
      error,
    });
    throw error;
  }
}