import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { StorageManager } from '../utils/storage';
import { logger } from '@/shared/logger';

/**
 * Input parameters for uploading image files
 */
export interface UploadImageParams {
  /** Supabase client for storage operations */
  supabase: SupabaseClient<Database>;
  /** Image file to upload */
  file: File;
  /** Optional folder prefix (defaults to 'temp-upload') */
  folder?: string;
}

/**
 * Uploads an image file to temporary storage.
 * 
 * This function:
 * 1. Validates the user is authenticated
 * 2. Validates the file is an image and within size limits
 * 3. Uploads to temporary storage with naming convention: {userId}/temp-upload-{timestamp}-{random}.{ext}
 * 4. Returns the public URL for immediate use
 * 
 * @param params - Object containing supabase client, file, and optional folder
 * @returns Promise<string> - Public URL of the uploaded image
 * 
 * @example
 * ```typescript
 * // Upload image during form creation
 * const file = new File(['...'], 'image.jpg', { type: 'image/jpeg' });
 * 
 * const imageUrl = await uploadImage({
 *   supabase,
 *   file,
 *   folder: 'temp-upload' // optional
 * });
 * 
 * // Use imageUrl in form for immediate display
 * console.log('Temp URL:', imageUrl);
 * // Result: 'https://proj.supabase.co/storage/v1/object/public/images/user-123/temp-upload-1234567890-abc123.jpg'
 * ```
 */
export async function uploadImage({
  supabase,
  file,
  folder = 'temp-upload',
}: UploadImageParams): Promise<string> {
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

    return result.url;
  } catch (error) {
    logger.error('❌ Image Upload: Failed to upload image', {
      fileName: file.name,
      userId: user.id,
      error,
    });
    throw error;
  }
}