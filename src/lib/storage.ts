import { supabase } from './supabase';
import { logger, logApiCall, logApiResponse } from './logger';

export interface UploadResult {
  url: string;
  path: string;
}

export class StorageManager {
  private static readonly BUCKET_NAME = 'images';
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private static readonly ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  /**
   * Initialize storage bucket if it doesn't exist
   */
  static async initializeBucket(): Promise<void> {
    try {
      logger.debug('🗄️ StorageManager: Checking if bucket exists...');
      
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        logger.warn('🗄️ StorageManager: Could not list buckets:', listError);
        return;
      }

      const bucketExists = buckets?.some(bucket => bucket.name === this.BUCKET_NAME);
      
      if (!bucketExists) {
        logger.info('🗄️ StorageManager: Creating images bucket...');
        
        const { error: createError } = await supabase.storage.createBucket(this.BUCKET_NAME, {
          public: true,
          allowedMimeTypes: this.ALLOWED_TYPES,
          fileSizeLimit: this.MAX_FILE_SIZE
        });

        if (createError) {
          logger.error('❌ StorageManager: Failed to create bucket:', createError);
        } else {
          logger.info('✅ StorageManager: Images bucket created successfully');
        }
      } else {
        logger.debug('✅ StorageManager: Images bucket already exists');
      }
    } catch (error) {
      logger.error('❌ StorageManager: Error initializing bucket:', error);
    }
  }

  /**
   * Upload a single file to Supabase Storage
   */
  static async uploadFile(file: File, folder: string = 'uploads'): Promise<UploadResult> {
    logger.debug('📤 StorageManager: Starting file upload:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      folder
    });

    // Validate file
    this.validateFile(file);

    // Generate unique filename
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    logApiCall('POST', `/storage/upload/${filePath}`, {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    try {
      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        logApiResponse('POST', `/storage/upload/${filePath}`, null, error);
        throw new Error(`Upload failed: ${error.message}`);
      }

      if (!data) {
        logApiResponse('POST', `/storage/upload/${filePath}`, null, 'No data returned');
        throw new Error('Upload failed: No data returned');
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(filePath);

      const result: UploadResult = {
        url: urlData.publicUrl,
        path: filePath
      };

      logApiResponse('POST', `/storage/upload/${filePath}`, {
        path: result.path,
        url: result.url
      });

      logger.info('✅ StorageManager: File uploaded successfully:', {
        originalName: file.name,
        storagePath: result.path,
        publicUrl: result.url
      });

      return result;
    } catch (error) {
      logger.error('❌ StorageManager: Upload error:', error);
      logApiResponse('POST', `/storage/upload/${filePath}`, null, error);
      throw error;
    }
  }

  /**
   * Upload multiple files
   */
  static async uploadFiles(files: File[], folder: string = 'uploads'): Promise<UploadResult[]> {
    logger.info('📤 StorageManager: Starting batch upload:', {
      fileCount: files.length,
      folder
    });

    const results: UploadResult[] = [];
    const errors: Error[] = [];

    for (const file of files) {
      try {
        const result = await this.uploadFile(file, folder);
        results.push(result);
      } catch (error) {
        logger.error('❌ StorageManager: Failed to upload file:', {
          fileName: file.name,
          error
        });
        errors.push(error as Error);
      }
    }

    if (errors.length > 0) {
      logger.warn('⚠️ StorageManager: Some uploads failed:', {
        successCount: results.length,
        errorCount: errors.length
      });
    }

    logger.info('✅ StorageManager: Batch upload completed:', {
      successCount: results.length,
      errorCount: errors.length
    });

    return results;
  }

  /**
   * Delete a file from storage
   */
  static async deleteFile(path: string): Promise<void> {
    logger.debug('🗑️ StorageManager: Deleting file:', { path });
    
    logApiCall('DELETE', `/storage/delete/${path}`, { path });

    try {
      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([path]);

      if (error) {
        logApiResponse('DELETE', `/storage/delete/${path}`, null, error);
        throw new Error(`Delete failed: ${error.message}`);
      }

      logApiResponse('DELETE', `/storage/delete/${path}`, { success: true });
      logger.info('✅ StorageManager: File deleted successfully:', { path });
    } catch (error) {
      logger.error('❌ StorageManager: Delete error:', error);
      logApiResponse('DELETE', `/storage/delete/${path}`, null, error);
      throw error;
    }
  }

  /**
   * Get public URL for a file
   */
  static getPublicUrl(path: string): string {
    const { data } = supabase.storage
      .from(this.BUCKET_NAME)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  /**
   * Validate file before upload
   */
  private static validateFile(file: File): void {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`File size too large. Maximum size is ${this.MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Check file type
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      throw new Error(`File type not allowed. Allowed types: ${this.ALLOWED_TYPES.join(', ')}`);
    }

    logger.debug('✅ StorageManager: File validation passed:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });
  }

  /**
   * Extract storage path from URL
   */
  static extractPathFromUrl(url: string): string | null {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!url.includes(supabaseUrl)) {
        return null;
      }

      const urlParts = url.split('/storage/v1/object/public/images/');
      return urlParts.length > 1 ? urlParts[1] : null;
    } catch (error) {
      logger.warn('⚠️ StorageManager: Could not extract path from URL:', { url, error });
      return null;
    }
  }
}