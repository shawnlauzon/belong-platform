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
    throw new Error('Resource not found for update');
  }

  // Handle community associations if communityIds is provided
  if (updates.communityIds !== undefined) {
    // Delete existing community associations
    const { error: deleteError } = await supabase
      .from('resource_communities')
      .delete()
      .eq('resource_id', id);

    if (deleteError) {
      logger.error('📚 API: Failed to delete existing community associations', {
        error: deleteError,
        resourceId: id,
      });
      throw deleteError;
    }

    // Insert new community associations if any
    if (updates.communityIds.length > 0) {
      const resourceCommunityInserts = updates.communityIds.map(
        (communityId) => ({
          resource_id: id,
          community_id: communityId,
        }),
      );

      const { error: insertError } = await supabase
        .from('resource_communities')
        .insert(resourceCommunityInserts);

      if (insertError) {
        logger.error('📚 API: Failed to insert new community associations', {
          error: insertError,
          resourceId: id,
          communityIds: updates.communityIds,
        });
        throw insertError;
      }
    }

    // Re-fetch the resource with updated community associations
    const { data: updatedData, error: refetchError } = (await supabase
      .from('resources')
      .select(SELECT_RESOURCES_JOIN_COMMUNITIES_JOIN_TIMESLOTS)
      .eq('id', id)
      .maybeSingle()) as {
      data: ResourceRowJoinCommunitiesJoinTimeslots | null;
      error: QueryError | null;
    };

    if (refetchError) {
      logger.error('📚 API: Failed to refetch updated resource', {
        error: refetchError,
        resourceId: id,
      });
      throw refetchError;
    }

    if (!updatedData) {
      logger.debug('📚 API: Resource not found after community update', {
        id: updateData.id,
      });
      return null;
    }

    // Use the updated data with fresh community associations
    const resource = toDomainResource(updatedData);

    logger.debug('📚 API: Successfully updated resource', {
      id: resource.id,
      title: resource.title,
      communityIds: resource.communityIds,
    });

    return resource;
  }

  // Use the original data if no community changes
  const resource = toDomainResource(data);

  logger.debug('📚 API: Successfully updated resource', {
    id: resource.id,
    title: resource.title,
    communityIds: resource.communityIds,
  });

  return resource;
}
