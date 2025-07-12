import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { GatheringInput, Gathering } from '@/features/gatherings';
import { toGatheringInsertRow } from '@/features/gatherings/transformers/gatheringTransformer';
import { GatheringRow } from '../types/gatheringRow';
import { commitImageUrls } from '@/features/images/api/imageCommit';
import { updateGathering } from './updateGathering';
import { getAuthIdOrThrow } from '@/shared/utils/auth-helpers';
import { toGatheringWithJoinedRelations } from '@/features/gatherings/transformers/gatheringTransformer';
import { ProfileRow } from '@/features/users/types/profileRow';
import { CommunityRow } from '@/features/communities';

export async function createGathering(
  supabase: SupabaseClient<Database>,
  gatheringData: GatheringInput,
): Promise<Gathering | null> {
  const currentUserId = await getAuthIdOrThrow(supabase);
  const dbData = toGatheringInsertRow({
    ...gatheringData,
    organizerId: currentUserId,
  });

  const { data, error } = (await supabase
    .from('gatherings')
    .insert(dbData)
    .select(
      `
    *,
    organizer:profiles!organizer_id(*),
    community:communities!community_id(*)
  `,
    )
    .single()) as {
    data: GatheringRow & { organizer: ProfileRow; community: CommunityRow };
    error: QueryError | null;
  };

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create gathering');
  }

  // Auto-commit any temporary image URLs after gathering creation
  if (gatheringData.imageUrls && gatheringData.imageUrls.length > 0) {
    try {
      const permanentUrls = await commitImageUrls({
        supabase,
        imageUrls: gatheringData.imageUrls,
        entityType: 'gathering',
        entityId: data.id,
      });

      // Update gathering with permanent URLs if they changed
      if (
        JSON.stringify(permanentUrls) !==
        JSON.stringify(gatheringData.imageUrls)
      ) {
        const updatedGathering = await updateGathering(supabase, {
          id: data.id,
          imageUrls: permanentUrls,
        });
        if (updatedGathering) {
          return updatedGathering;
        }
      }
    } catch (error) {
      throw new Error(
        `Failed to commit gathering images: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  return toGatheringWithJoinedRelations(data);
}
