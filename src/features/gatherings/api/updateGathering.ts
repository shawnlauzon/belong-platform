import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { GatheringInput, Gathering } from '@/features/gatherings';
import {
  toGatheringUpdateRow,
  toGatheringWithJoinedRelations,
} from '@/features/gatherings/transformers/gatheringTransformer';
import { logger } from '@/shared';
import { getAuthIdOrThrow } from '@/shared/utils/auth-helpers';

export async function updateGathering(
  supabase: SupabaseClient<Database>,
  updateData: Partial<GatheringInput> & { id: string },
): Promise<Gathering | null> {
  logger.debug('📅 API: Updating gathering', {
    id: updateData.id,
    title: updateData.title,
  });

  try {
    await getAuthIdOrThrow(supabase);

    const { id, ...updates } = updateData;
    const dbData = toGatheringUpdateRow(updates);

    const { data, error } = await supabase
      .from('gatherings')
      .update(dbData)
      .eq('id', id)
      .select(
        `
        *,
        organizer:profiles!organizer_id(*),
        community:communities!community_id(*)
      `,
      )
      .single();

    if (error) {
      logger.error('📅 API: Failed to update gathering', { error, updateData });
      throw error;
    }

    if (!data) {
      logger.debug('📅 API: Gathering not found for update', {
        id: updateData.id,
      });
      return null;
    }

    logger.debug('📅 API: Successfully updated gathering', {
      id: data.id,
      title: data.title,
    });
    return toGatheringWithJoinedRelations(data);
  } catch (error) {
    logger.error('📅 API: Error updating gathering', { error, updateData });
    throw error;
  }
}
