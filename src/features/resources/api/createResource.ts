import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { ResourceInput, Resource } from '@/features/resources';
import { toResourceInsertRow } from '@/features/resources/transformers/resourceTransformer';
import { getAuthIdOrThrow } from '@/shared/utils/auth-helpers';
import { commitImageUrls } from '@/features/images/api/imageCommit';
import { updateResource } from './updateResource';
import { SELECT_RESOURCE_WITH_RELATIONS } from '../types/resourceRow';
import { toDomainResource } from '@/features/resources/transformers/resourceTransformer';

export async function createResource(
  supabase: SupabaseClient<Database>,
  resourceData: ResourceInput,
): Promise<Resource> {
  const currentUserId = await getAuthIdOrThrow(supabase);

  const dbData = toResourceInsertRow({
    ...resourceData,
    ownerId: currentUserId,
  });

  const { data, error } = await supabase
    .from('resources')
    .insert(dbData)
    .select(SELECT_RESOURCE_WITH_RELATIONS)
    .single();

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
      if (
        JSON.stringify(permanentUrls) !== JSON.stringify(resourceData.imageUrls)
      ) {
        const updatedResource = await updateResource(supabase, {
          id: data.id,
          imageUrls: permanentUrls,
        });
        if (updatedResource) {
          return updatedResource;
        }
      }
    } catch (error) {
      throw new Error(
        `Failed to commit resource images: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  return toDomainResource(data);
}
