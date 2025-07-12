import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

const IMAGE_BUCKET = 'images';

/**
 * Optimized temp image cleanup for testing - uses batch operations
 */
export async function optimizedCleanupTempImages(
  supabase: SupabaseClient<Database>,
  maxAgeHours: number = 24,
): Promise<number> {
  try {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - maxAgeHours);

    // Get all folders in parallel
    const { data: folders, error } = await supabase.storage
      .from(IMAGE_BUCKET)
      .list('', { limit: 1000 });

    if (error || !folders) {
      return 0;
    }

    // Process folders in parallel batches
    const batchSize = 10;
    const allTempFiles: string[] = [];

    for (let i = 0; i < folders.length; i += batchSize) {
      const batch = folders.slice(i, i + batchSize);

      const batchPromises = batch
        .filter((f) => f.id === null) // Only folders
        .map(async (folder) => {
          const { data: files } = await supabase.storage
            .from(IMAGE_BUCKET)
            .list(folder.name, {
              limit: 1000,
              sortBy: { column: 'created_at', order: 'asc' },
            });

          if (!files) return [];

          return files
            .filter((file) => {
              const isTemp = file.name.includes('temp-upload-');
              const fileAge = new Date(file.created_at || '');
              return isTemp && fileAge < cutoffTime;
            })
            .map((file) => `${folder.name}/${file.name}`);
        });

      const batchResults = await Promise.all(batchPromises);
      allTempFiles.push(...batchResults.flat());
    }

    if (allTempFiles.length === 0) {
      return 0;
    }

    // Delete all temp files in one batch operation
    const { error: deleteError } = await supabase.storage
      .from(IMAGE_BUCKET)
      .remove(allTempFiles);

    if (deleteError) {
      console.warn('Error deleting temp files:', deleteError);
      return 0;
    }

    return allTempFiles.length;
  } catch (error) {
    console.warn('Error in optimized temp cleanup:', error);
    return 0;
  }
}

/**
 * Optimized entity image cleanup - reduced API calls
 */
export async function optimizedCleanupEntityImages(
  supabase: SupabaseClient<Database>,
  entityType: string,
  entityId: string,
): Promise<number> {
  try {
    const entityPattern = `/${entityType}-${entityId}-`;

    // Get folders in batches
    const { data: folders, error } = await supabase.storage
      .from(IMAGE_BUCKET)
      .list('', { limit: 1000 });

    if (error || !folders) {
      return 0;
    }

    const allEntityFiles: string[] = [];

    // Process folders in parallel
    const folderPromises = folders
      .filter((f) => f.id === null)
      .map(async (folder) => {
        const { data: files } = await supabase.storage
          .from(IMAGE_BUCKET)
          .list(folder.name, { limit: 1000 });

        if (!files) return [];

        return files
          .filter((file) => `/${file.name}`.includes(entityPattern))
          .map((file) => `${folder.name}/${file.name}`);
      });

    const results = await Promise.all(folderPromises);
    allEntityFiles.push(...results.flat());

    if (allEntityFiles.length === 0) {
      return 0;
    }

    // Delete all entity files in one operation
    const { error: deleteError } = await supabase.storage
      .from(IMAGE_BUCKET)
      .remove(allEntityFiles);

    if (deleteError) {
      console.warn('Error deleting entity files:', deleteError);
      return 0;
    }

    return allEntityFiles.length;
  } catch (error) {
    console.warn('Error in optimized entity cleanup:', error);
    return 0;
  }
}

/**
 * Optimized orphan detection with batched database queries
 */
export async function optimizedFindOrphanedImages(
  supabase: SupabaseClient<Database>,
  dryRun: boolean = true,
): Promise<string[]> {
  try {
    // Get all permanent files
    const { data: folders, error } = await supabase.storage
      .from(IMAGE_BUCKET)
      .list('', { limit: 1000 });

    if (error || !folders) {
      return [];
    }

    const allPermanentFiles: string[] = [];

    // Collect all permanent files
    const filePromises = folders
      .filter((f) => f.id === null)
      .map(async (folder) => {
        const { data: files } = await supabase.storage
          .from(IMAGE_BUCKET)
          .list(folder.name, { limit: 1000 });

        if (!files) return [];

        return files
          .filter(
            (file) =>
              !file.name.includes('temp-upload-') && file.name.includes('-'), // Has entity pattern
          )
          .map((file) => `${folder.name}/${file.name}`);
      });

    const results = await Promise.all(filePromises);
    allPermanentFiles.push(...results.flat());

    if (allPermanentFiles.length === 0) {
      return [];
    }

    // Group files by entity type for batch queries
    const filesByEntity: Record<string, { path: string; entityId: string }[]> =
      {};

    for (const filePath of allPermanentFiles) {
      const parts = filePath.split('/')[1]?.split('-');
      if (parts && parts.length >= 2) {
        const entityType = parts[0];
        const entityId = parts[1];

        if (!filesByEntity[entityType]) {
          filesByEntity[entityType] = [];
        }
        filesByEntity[entityType].push({ path: filePath, entityId });
      }
    }

    const orphanedFiles: string[] = [];

    // Check each entity type with batch queries
    for (const [entityType, files] of Object.entries(filesByEntity)) {
      const entityIds = [...new Set(files.map((f) => f.entityId))];

      if (entityIds.length === 0) continue;

      let existingIds: string[] = [];

      // Batch query for existing entities
      switch (entityType) {
        case 'resource': {
          const { data } = await supabase
            .from('resources')
            .select('id')
            .in('id', entityIds);
          existingIds = data?.map((d) => d.id) || [];
          break;
        }
        case 'gathering': {
          const { data } = await supabase
            .from('gatherings')
            .select('id')
            .in('id', entityIds);
          existingIds = data?.map((d) => d.id) || [];
          break;
        }
        case 'community': {
          const { data } = await supabase
            .from('communities')
            .select('id')
            .in('id', entityIds);
          existingIds = data?.map((d) => d.id) || [];
          break;
        }
        case 'user': {
          const { data } = await supabase
            .from('profiles')
            .select('id')
            .in('id', entityIds);
          existingIds = data?.map((d) => d.id) || [];
          break;
        }
        case 'shoutout': {
          const { data } = await supabase
            .from('shoutouts')
            .select('id')
            .in('id', entityIds);
          existingIds = data?.map((d) => d.id) || [];
          break;
        }
      }

      // Find orphaned files
      const existingIdSet = new Set(existingIds);
      const orphanedInType = files
        .filter((f) => !existingIdSet.has(f.entityId))
        .map((f) => f.path);

      orphanedFiles.push(...orphanedInType);
    }

    // Delete orphaned files if not dry run
    if (!dryRun && orphanedFiles.length > 0) {
      const { error: deleteError } = await supabase.storage
        .from(IMAGE_BUCKET)
        .remove(orphanedFiles);

      if (deleteError) {
        console.warn('Error deleting orphaned files:', deleteError);
      }
    }

    return orphanedFiles;
  } catch (error) {
    console.warn('Error in optimized orphan detection:', error);
    return [];
  }
}
