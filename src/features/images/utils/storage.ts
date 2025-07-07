import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { logger, logApiCall, logApiResponse } from '@/shared/logger';

/**
 * Result of a successful file upload operation.
 */
export interface UploadResult {
  /** Public URL to access the uploaded file */
  url: string;
  /** Storage path where the file was saved */
  path: string;
}

/**
 * Utility class for managing file uploads and storage operations using Supabase Storage.
 *
 * This class provides methods for uploading images, initializing storage buckets,
 * and generating public URLs for files. Includes automatic logging and error handling
 * for all storage operations in the Belong Network platform.
 *
 * @example
 * ```typescript
 * import { StorageManager } from '@belongnetwork/core';
 * import { createSupabaseClient } from '@belongnetwork/core';
 *
 * const supabase = createSupabaseClient(url, key);
 *
 * // Initialize storage bucket
 * await StorageManager.initializeBucket(supabase);
 *
 * // Upload an image file
 * const file = new File(['...'], 'profile.jpg', { type: 'image/jpeg' });
 * const result = await StorageManager.uploadImage(supabase, file, 'user-123');
 *
 * console.log('Image uploaded:', result.url);
 * // Uses the public URL in your application
 * ```
 *
 * @example
 * ```typescript
 * // Upload with custom path
 * async function uploadResourceImage(file: File, resourceId: string) {
 *   try {
 *     const result = await StorageManager.uploadImage(
 *       supabase,
 *       file,
 *       `resources/${resourceId}`
 *     );
 *     return result.url;
 *   } catch (error) {
 *     console.error('Upload failed:', error);
 *     throw error;
 *   }
 * }
 * ```
 *
 * @category Utilities
 */
export class StorageManager {
  private static bucketName = 'images';

  static async initializeBucket(
    supabaseClient: SupabaseClient<Database>
  ): Promise<void> {
    logger.debug('🗄️ StorageManager: Initializing bucket...');

    try {
      // Check if bucket exists
      const { data: buckets, error: listError } =
        await supabaseClient.storage.listBuckets();

      if (listError) {
        logger.warn('🗄️ StorageManager: Could not list buckets:', listError);
        return;
      }

      const bucketExists = buckets?.some(
        (bucket: { id: string }) => bucket.id === this.bucketName
      );

      if (bucketExists) {
        logger.info('✅ StorageManager: Images bucket already exists');
        return;
      }

      logger.info('🗄️ StorageManager: Images bucket exists and is ready');
    } catch (error) {
      logger.error('❌ StorageManager: Failed to initialize bucket:', error);
    }
  }

  static async uploadFile(
    file: File,
    supabaseClient: SupabaseClient<Database>,
    folder: string = 'uploads'
  ): Promise<UploadResult> {
    logger.debug('🗄️ StorageManager: Uploading file:', {
      fileName: file.name,
      fileSize: file.size,
      folder,
    });

    try {
      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabaseClient.auth.getUser();

      if (userError || !user) {
        throw new Error('User must be authenticated to upload files');
      }

      // Generate unique filename with new naming convention: {userId}/{folder}-{timestamp}-{random}.{ext}
      const fileExt = file.name.split('.').pop();
      const fileName = `${folder}-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      logApiCall('POST', `/storage/upload/${filePath}`, {
        fileName: file.name,
        fileSize: file.size,
      });

      // Upload file
      const { data, error } = await supabaseClient.storage
        .from(this.bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        logApiResponse('POST', `/storage/upload/${filePath}`, null, error);
        throw new Error(`Upload failed: ${error.message}`);
      }

      if (!data) {
        throw new Error('Upload failed: No data returned');
      }

      // Get public URL
      const { data: urlData } = supabaseClient.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      logApiResponse('POST', `/storage/upload/${filePath}`, {
        path: data.path,
        publicUrl,
      });

      logger.info('✅ StorageManager: File uploaded successfully:', {
        fileName: file.name,
        path: data.path,
        publicUrl,
      });

      return {
        url: publicUrl,
        path: data.path,
      };
    } catch (error) {
      logger.error('❌ StorageManager: Failed to upload file:', {
        fileName: file.name,
        error,
      });
      throw error;
    }
  }

  static async uploadFiles(
    files: File[],
    supabaseClient: SupabaseClient<Database>,
    folder: string = 'uploads'
  ): Promise<string[]> {
    logger.debug('🗄️ StorageManager: Uploading multiple files:', {
      count: files.length,
      folder,
    });

    const uploadPromises = files.map((file) =>
      this.uploadFile(file, supabaseClient, folder)
    );

    try {
      const results = await Promise.allSettled(uploadPromises);

      const successfulUploads: string[] = [];
      const failedUploads: string[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          successfulUploads.push(result.value.url);
        } else {
          failedUploads.push(files[index].name);
          if (result.status === 'rejected') {
            logger.error('❌ StorageManager: File upload failed:', {
              fileName: files[index].name,
              error: result.reason,
            });
          }
        }
      });

      if (failedUploads.length > 0) {
        logger.warn('⚠️ StorageManager: Some uploads failed:', {
          successful: successfulUploads.length,
          failed: failedUploads.length,
          failedFiles: failedUploads,
        });
      }

      if (successfulUploads.length === 0) {
        throw new Error('No files were uploaded successfully');
      }

      logger.info('✅ StorageManager: Batch upload completed:', {
        successful: successfulUploads.length,
        failed: failedUploads.length,
      });

      return successfulUploads;
    } catch (error) {
      logger.error('❌ StorageManager: Upload failed:', error);
      throw error;
    }
  }

  static extractPathFromUrl(url: string): string | null {
    logger.debug('🗄️ StorageManager: Extracting path from URL:', { url });

    try {
      // Parse the URL to extract the path
      const urlObj = new URL(url);

      // Supabase storage URLs typically follow this pattern:
      // https://[project-ref].supabase.co/storage/v1/object/public/[bucket-name]/[file-path]
      const pathSegments = urlObj.pathname.split('/');

      // Find the bucket name in the path
      const bucketIndex = pathSegments.findIndex(
        (segment) => segment === this.bucketName
      );

      if (bucketIndex === -1 || bucketIndex === pathSegments.length - 1) {
        logger.warn('🗄️ StorageManager: Could not find bucket in URL path:', {
          url,
          bucketName: this.bucketName,
        });
        return null;
      }

      // Extract the file path after the bucket name
      const filePath = pathSegments.slice(bucketIndex + 1).join('/');

      if (!filePath) {
        logger.warn('🗄️ StorageManager: No file path found in URL:', { url });
        return null;
      }

      logger.debug('✅ StorageManager: Extracted file path:', {
        url,
        filePath,
      });
      return filePath;
    } catch (error) {
      logger.error('❌ StorageManager: Failed to extract path from URL:', {
        url,
        error,
      });
      return null;
    }
  }

  static async deleteFile(
    filePath: string,
    supabaseClient: SupabaseClient<Database>
  ): Promise<boolean> {
    logger.debug('🗄️ StorageManager: Deleting file:', { filePath });

    try {
      logApiCall('DELETE', `/storage/delete/${filePath}`);

      const { error } = await supabaseClient.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        logApiResponse('DELETE', `/storage/delete/${filePath}`, null, error);
        throw error;
      }

      logApiResponse('DELETE', `/storage/delete/${filePath}`, {
        success: true,
      });
      logger.info('✅ StorageManager: File deleted successfully:', {
        filePath,
      });

      return true;
    } catch (error) {
      logger.error('❌ StorageManager: Failed to delete file:', {
        filePath,
        error,
      });
      return false;
    }
  }
}
