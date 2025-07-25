import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { ResourceInput, Resource } from '@/features/resources';
import { toResourceInsertRow } from '@/features/resources/transformers/resourceTransformer';
import { commitImageUrls } from '@/features/images/api/imageCommit';
import { updateResource } from './updateResource';
import {
  ResourceRowJoinCommunities,
  SELECT_RESOURCES_JOIN_COMMUNITIES,
} from '../types/resourceRow';
import { toDomainResource } from '@/features/resources/transformers/resourceTransformer';

export async function createResource(
  supabase: SupabaseClient<Database>,
  resourceData: ResourceInput,
): Promise<Resource> {
  // // Validate user membership in all specified communities
  // const userCommunities = await fetchUserCommunities(supabase, currentUserId);
  // const userCommunityIds = userCommunities.map(
  //   (membership) => membership.communityId,
  // );

  // const invalidCommunityIds = resourceData.communityIds.filter(
  //   (communityId) => !userCommunityIds.includes(communityId),
  // );

  // if (invalidCommunityIds.length > 0) {
  //   throw new Error(
  //     `User is not a member of communities: ${invalidCommunityIds.join(', ')}`,
  //   );
  // }

  const withoutCommunityIds = {
    ...resourceData,
    communityIds: undefined,
  };

  const { data, error } = await supabase
    .from('resources')
    .insert(toResourceInsertRow(withoutCommunityIds))
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create resource');
  }

  // Create resource-community associations
  const resourceCommunityInserts = resourceData.communityIds.map(
    (communityId) => ({
      resource_id: data.id,
      community_id: communityId,
    }),
  );

  const { error: junctionError } = await supabase
    .from('resource_communities')
    .insert(resourceCommunityInserts);

  if (junctionError) {
    // Clean up the resource if junction table insertion fails
    await supabase.from('resources').delete().eq('id', data.id);
    throw new Error(
      `Failed to associate resource with communities: ${junctionError.message}`,
    );
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

  // Fetch the complete resource with all relations now that community associations exist
  const { data: completeResource, error: fetchError } = (await supabase
    .from('resources')
    .select(SELECT_RESOURCES_JOIN_COMMUNITIES)
    .eq('id', data.id)
    .single()) as {
    data: ResourceRowJoinCommunities;
    error: QueryError | null;
  };

  if (fetchError || !completeResource) {
    throw new Error(fetchError?.message || 'Failed to fetch complete resource');
  }

  return toDomainResource(completeResource);
}
