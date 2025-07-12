import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { ResourceInput, Resource } from '@/features/resources';
import { forDbUpdate } from '@/features/resources/transformers/resourceTransformer';
import { logger } from '@/shared';
import { getAuthIdOrThrow } from '@/shared/utils/auth-helpers';
import { toDomainResource } from '@/features/resources/transformers/resourceTransformer';
import { SELECT_RESOURCE_WITH_RELATIONS } from '../types/resourceRow';

export async function updateResource(
  supabase: SupabaseClient<Database>,
  updateData: Partial<ResourceInput> & { id: string },
): Promise<Resource | null> {
  logger.debug('📚 API: Updating resource', {
    id: updateData.id,
    title: updateData.title,
  });

  try {
    await getAuthIdOrThrow(supabase);

    const { id, ...updates } = updateData;
    const dbData = forDbUpdate(updates);

    const { data, error } = await supabase
      .from('resources')
      .update(dbData)
      .eq('id', id)
      .select(SELECT_RESOURCE_WITH_RELATIONS)
      .single();

    if (error) {
      logger.error('📚 API: Failed to update resource', { error, updateData });
      throw error;
    }

    if (!data) {
      logger.debug('📚 API: Resource not found for update', {
        id: updateData.id,
      });
      return null;
    }

    const resource = toDomainResource(data);

    logger.debug('📚 API: Successfully updated resource', {
      id: resource.id,
      title: resource.title,
    });
    return resource;
  } catch (error) {
    logger.error('📚 API: Error updating resource', { error, updateData });
    throw error;
  }
}
