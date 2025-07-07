import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { logger } from '@/shared/logger';

/**
 * Service for cleaning up temporary and orphaned images.
 * 
 * This service provides functions to:
 * 1. Clean up temporary images older than 24 hours
 * 2. Clean up orphaned permanent images when entities are deleted
 * 3. Detect and remove unreferenced images
 */
export class ImageCleanupService {
  private static bucketName = 'images';

  /**
   * Cleans up temporary images older than the specified age.
   * 
   * @param supabase - Supabase client
   * @param maxAgeHours - Maximum age in hours before temp images are deleted (default: 24)
   * @returns Promise<number> - Number of images cleaned up
   */
  static async cleanupTempImages(
    supabase: SupabaseClient<Database>,
    maxAgeHours: number = 24
  ): Promise<number> {
    logger.info('🧹 Image Cleanup: Starting temp image cleanup', { maxAgeHours });

    try {
      // List all files in the images bucket
      const { data: files, error } = await supabase.storage
        .from(this.bucketName)
        .list('', {
          limit: 1000, // Adjust based on needs
          sortBy: { column: 'created_at', order: 'asc' }
        });

      if (error) {
        throw new Error(`Failed to list images: ${error.message}`);
      }

      if (!files || files.length === 0) {
        logger.info('🧹 Image Cleanup: No images found');
        return 0;
      }

      // Filter for temp files older than maxAge
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - maxAgeHours);

      const tempFilesToDelete = files.filter(file => {
        const isTemp = file.name.startsWith('temp/') || file.name.startsWith('temp-');
        const fileAge = new Date(file.created_at || '');
        const isOld = fileAge < cutoffTime;
        
        return isTemp && isOld;
      });

      if (tempFilesToDelete.length === 0) {
        logger.info('🧹 Image Cleanup: No old temp images to delete');
        return 0;
      }

      // Delete the old temp files
      const filePaths = tempFilesToDelete.map(file => file.name);
      const { error: deleteError } = await supabase.storage
        .from(this.bucketName)
        .remove(filePaths);

      if (deleteError) {
        throw new Error(`Failed to delete temp images: ${deleteError.message}`);
      }

      logger.info('✅ Image Cleanup: Successfully deleted temp images', {
        count: tempFilesToDelete.length,
        files: filePaths
      });

      return tempFilesToDelete.length;
    } catch (error) {
      logger.error('❌ Image Cleanup: Failed to cleanup temp images', { error });
      throw error;
    }
  }

  /**
   * Cleans up images associated with a deleted entity.
   * 
   * @param supabase - Supabase client
   * @param entityType - Type of entity that was deleted
   * @param entityId - ID of the deleted entity
   * @returns Promise<number> - Number of images cleaned up
   */
  static async cleanupEntityImages(
    supabase: SupabaseClient<Database>,
    entityType: string,
    entityId: string
  ): Promise<number> {
    logger.info('🧹 Image Cleanup: Cleaning up entity images', {
      entityType,
      entityId
    });

    try {
      // List all files in the images bucket
      const { data: files, error } = await supabase.storage
        .from(this.bucketName)
        .list('', {
          limit: 1000,
        });

      if (error) {
        throw new Error(`Failed to list images: ${error.message}`);
      }

      if (!files || files.length === 0) {
        return 0;
      }

      // Filter for files belonging to this entity
      const entityPrefix = `${entityType}-${entityId}-`;
      const entityFilesToDelete = files.filter(file => 
        file.name.startsWith(entityPrefix)
      );

      if (entityFilesToDelete.length === 0) {
        logger.info('🧹 Image Cleanup: No images found for entity');
        return 0;
      }

      // Delete the entity files
      const filePaths = entityFilesToDelete.map(file => file.name);
      const { error: deleteError } = await supabase.storage
        .from(this.bucketName)
        .remove(filePaths);

      if (deleteError) {
        throw new Error(`Failed to delete entity images: ${deleteError.message}`);
      }

      logger.info('✅ Image Cleanup: Successfully deleted entity images', {
        entityType,
        entityId,
        count: entityFilesToDelete.length,
        files: filePaths
      });

      return entityFilesToDelete.length;
    } catch (error) {
      logger.error('❌ Image Cleanup: Failed to cleanup entity images', {
        entityType,
        entityId,
        error
      });
      throw error;
    }
  }

  /**
   * Finds and optionally removes orphaned images that are not referenced by any entities.
   * 
   * Note: This function requires access to the database to check references.
   * Use with caution in production environments.
   * 
   * @param supabase - Supabase client
   * @param dryRun - If true, only reports orphaned images without deleting (default: true)
   * @returns Promise<string[]> - Array of orphaned image paths
   */
  static async findOrphanedImages(
    supabase: SupabaseClient<Database>,
    dryRun: boolean = true
  ): Promise<string[]> {
    logger.info('🧹 Image Cleanup: Finding orphaned images', { dryRun });

    try {
      // List all permanent image files (not temp)
      const { data: files, error } = await supabase.storage
        .from(this.bucketName)
        .list('', {
          limit: 1000,
        });

      if (error) {
        throw new Error(`Failed to list images: ${error.message}`);
      }

      if (!files || files.length === 0) {
        return [];
      }

      // Filter for permanent files (not temp)
      const permanentFiles = files.filter(file => 
        !file.name.startsWith('temp/') && 
        !file.name.startsWith('temp-') &&
        file.name.includes('-') // Should have entity-id pattern
      );

      const orphanedFiles: string[] = [];

      // Check each permanent file to see if its entity still exists
      for (const file of permanentFiles) {
        const isOrphaned = await this.isImageOrphaned(supabase, file.name);
        if (isOrphaned) {
          orphanedFiles.push(file.name);
        }
      }

      if (orphanedFiles.length === 0) {
        logger.info('🧹 Image Cleanup: No orphaned images found');
        return [];
      }

      logger.info('🧹 Image Cleanup: Found orphaned images', {
        count: orphanedFiles.length,
        files: orphanedFiles
      });

      // Delete orphaned files if not dry run
      if (!dryRun) {
        const { error: deleteError } = await supabase.storage
          .from(this.bucketName)
          .remove(orphanedFiles);

        if (deleteError) {
          throw new Error(`Failed to delete orphaned images: ${deleteError.message}`);
        }

        logger.info('✅ Image Cleanup: Successfully deleted orphaned images', {
          count: orphanedFiles.length
        });
      }

      return orphanedFiles;
    } catch (error) {
      logger.error('❌ Image Cleanup: Failed to find orphaned images', { error });
      throw error;
    }
  }

  /**
   * Checks if an image file is orphaned (its entity no longer exists).
   * 
   * @param supabase - Supabase client
   * @param fileName - Name of the image file
   * @returns Promise<boolean> - True if the image is orphaned
   */
  private static async isImageOrphaned(
    supabase: SupabaseClient<Database>,
    fileName: string
  ): Promise<boolean> {
    try {
      // Parse entity type and ID from filename
      // Expected format: {entityType}-{entityId}-{timestamp}-{filename}
      const parts = fileName.split('-');
      if (parts.length < 2) {
        return false; // Can't parse, assume not orphaned
      }

      const entityType = parts[0];
      const entityId = parts[1];

      // Check if entity exists based on type
      switch (entityType) {
        case 'resource': {
          const { data } = await supabase
            .from('resources')
            .select('id')
            .eq('id', entityId)
            .single();
          return !data;
        }
        case 'event': {
          const { data } = await supabase
            .from('events')
            .select('id')
            .eq('id', entityId)
            .single();
          return !data;
        }
        case 'community': {
          const { data } = await supabase
            .from('communities')
            .select('id')
            .eq('id', entityId)
            .single();
          return !data;
        }
        case 'user': {
          const { data } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', entityId)
            .single();
          return !data;
        }
        case 'shoutout': {
          const { data } = await supabase
            .from('shoutouts')
            .select('id')
            .eq('id', entityId)
            .single();
          return !data;
        }
        default:
          // Unknown entity type, assume not orphaned
          return false;
      }
    } catch (error) {
      logger.warn('🧹 Image Cleanup: Error checking if image is orphaned', {
        fileName,
        error
      });
      // On error, assume not orphaned to be safe
      return false;
    }
  }
}