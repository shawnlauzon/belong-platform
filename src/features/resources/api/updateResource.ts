import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { ResourceData, ResourceInfo } from '@/features/resources';
import { forDbUpdate } from '@/features/resources/transformers/resourceTransformer';
import { toResourceInfo } from '@/features/resources/transformers/resourceTransformer';
import { logger } from '@/shared';
import { getAuthIdOrThrow } from '@/shared/utils/auth-helpers';

export async function updateResource(
  supabase: SupabaseClient<Database>,
  updateData: Partial<ResourceData> & { id: string },
): Promise<ResourceInfo | null> {
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
      .select()
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

    const resourceInfo = toResourceInfo(data);

    logger.debug('📚 API: Successfully updated resource', {
      id: resourceInfo.id,
      title: resourceInfo.title,
    });
    return resourceInfo;
  } catch (error) {
    logger.error('📚 API: Error updating resource', { error, updateData });
    throw error;
  }
}
