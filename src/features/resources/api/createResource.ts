import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { ResourceData, ResourceInfo } from '@/features/resources';
import { forDbInsert } from '@/features/resources/transformers/resourceTransformer';
import { toResourceInfo } from '@/features/resources/transformers/resourceTransformer';
import { ResourceRow } from '../types/database';
import { getAuthIdOrThrow } from '@/shared';
import { commitImageUrls } from '@/features/images/api/imageCommit';

export async function createResource(
  supabase: SupabaseClient<Database>,
  resourceData: ResourceData,
): Promise<ResourceInfo | null> {
  const currentUserId = await getAuthIdOrThrow(supabase);

  const dbData = forDbInsert({
    ...resourceData,
    ownerId: currentUserId,
  });

  const { data, error } = (await supabase
    .from('resources')
    .insert(dbData)
    .select()
    .single()) as { data: ResourceRow; error: QueryError | null };

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create resource');
  }

  // Auto-commit any temporary image URLs after resource creation
  if (resourceData.imageUrls && resourceData.imageUrls.length > 0) {
    try {
      const permanentUrls = await commitImageUrls({
        supabase,
        imageUrls: resourceData.imageUrls,
        entityType: 'resource',
        entityId: data.id,
      });
      
      // Update resource with permanent URLs if they changed
      if (JSON.stringify(permanentUrls) !== JSON.stringify(resourceData.imageUrls)) {
        const { updateResource } = await import('./updateResource');
        const updatedResource = await updateResource(supabase, {
          id: data.id,
          imageUrls: permanentUrls,
        });
        if (updatedResource) {
          return updatedResource;
        }
      }
    } catch (error) {
      throw new Error(`Failed to commit resource images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return toResourceInfo(data);
}
