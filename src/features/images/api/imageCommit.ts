import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { StorageManager } from '@/shared/utils/storage';
import { logger } from '@/shared/logger';

/**
 * Supported entity types for image commits
 */
export type EntityType = 'resource' | 'event' | 'community' | 'user' | 'shoutout';

/**
 * Commits temporary image URLs to permanent storage locations.
 * 
 * This function:
 * 1. Identifies which URLs are temporary (contain "temp/" path)
 * 2. Moves temporary files to permanent paths using entity type and ID
 * 3. Returns updated URLs with permanent paths
 * 4. Leaves already-permanent URLs unchanged
 * 
 * @param imageUrls - Array of image URLs to commit
 * @param entityType - Type of entity the images belong to
 * @param entityId - ID of the entity the images belong to
 * @param supabase - Supabase client for storage operations
 * @returns Promise<string[]> - Array of permanent image URLs
 * 
 * @example
 * ```typescript
 * // Commit temp images when creating a resource
 * const tempUrls = [
 *   'https://proj.supabase.co/storage/v1/object/public/images/temp/user-123/photo.jpg'
 * ];
 * 
 * const permanentUrls = await commitImageUrls(
 *   tempUrls,
 *   'resource',
 *   'resource-456',
 *   supabase
 * );
 * 
 * // Result: ['https://proj.supabase.co/storage/v1/object/public/images/resource-resource-456-photo.jpg']
 * ```
 */
export async function commitImageUrls(
  imageUrls: string[],
  entityType: EntityType,
  entityId: string,
  supabase: SupabaseClient<Database>
): Promise<string[]> {
  if (!imageUrls || imageUrls.length === 0) {
    return [];
  }

  logger.debug('🖼️ Image Commit: Starting commit', {
    urlCount: imageUrls.length,
    entityType,
    entityId,
  });

  const committedUrls: string[] = [];

  for (const url of imageUrls) {
    if (!url) {
      logger.warn('🖼️ Image Commit: Skipping empty URL');
      continue;
    }

    // Extract the storage path from the URL
    const currentPath = StorageManager.extractPathFromUrl(url);
    if (!currentPath) {
      logger.warn('🖼️ Image Commit: Could not extract path from URL', { url });
      continue;
    }

    // Check if this is a temporary file (starts with "temp/")
    if (!currentPath.startsWith('temp/')) {
      // Already permanent, keep as-is
      committedUrls.push(url);
      logger.debug('🖼️ Image Commit: URL already permanent', { url });
      continue;
    }

    // Extract the filename from the temp path
    const pathParts = currentPath.split('/');
    const filename = pathParts[pathParts.length - 1]; // Get last part (filename)

    // Generate new permanent path: {entityType}-{entityId}-{filename}
    const permanentPath = `${entityType}-${entityId}-${filename}`;

    logger.debug('🖼️ Image Commit: Moving file', {
      from: currentPath,
      to: permanentPath,
    });

    try {
      // Move the file in storage
      const { error } = await supabase.storage
        .from('images')
        .move(currentPath, permanentPath);

      if (error) {
        throw new Error(`Failed to commit image ${currentPath}: ${error.message}`);
      }

      // Get the new public URL
      const { data } = supabase.storage
        .from('images')
        .getPublicUrl(permanentPath);

      committedUrls.push(data.publicUrl);

      logger.info('✅ Image Commit: Successfully committed', {
        from: currentPath,
        to: permanentPath,
        newUrl: data.publicUrl,
      });
    } catch (error) {
      logger.error('❌ Image Commit: Failed to commit image', {
        currentPath,
        permanentPath,
        error,
      });
      throw error;
    }
  }

  logger.info('✅ Image Commit: Completed commit', {
    originalCount: imageUrls.length,
    committedCount: committedUrls.length,
    entityType,
    entityId,
  });

  return committedUrls;
}