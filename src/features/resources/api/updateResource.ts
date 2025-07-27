import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { ResourceInput, Resource } from '@/features/resources';
import { forDbUpdate } from '@/features/resources/transformers/resourceTransformer';
import { logger } from '@/shared';
import { toDomainResource } from '@/features/resources/transformers/resourceTransformer';
import {
  ResourceRowJoinCommunitiesJoinTimeslots,
  SELECT_RESOURCES_JOIN_COMMUNITIES_JOIN_TIMESLOTS,
} from '../types/resourceRow';
import { QueryError } from '@supabase/supabase-js';

export async function updateResource(
  supabase: SupabaseClient<Database>,
  updateData: Partial<ResourceInput> & { id: string },
): Promise<Resource | null> {
  logger.debug('📚 API: Updating resource', {
    id: updateData.id,
    title: updateData.title,
  });

  const { id, ...updates } = updateData;
  const dbData = forDbUpdate(updates);

  const { data, error } = (await supabase
    .from('resources')
    .update(dbData)
    .eq('id', id)
    .select(SELECT_RESOURCES_JOIN_COMMUNITIES_JOIN_TIMESLOTS)
    .maybeSingle()) as {
    data: ResourceRowJoinCommunitiesJoinTimeslots | null;
    error: QueryError | null;
  };

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
}
