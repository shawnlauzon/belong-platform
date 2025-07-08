import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { EventData, EventInfo } from '@/features/events';
import { forDbUpdate } from '@/features/events/transformers/eventTransformer';
import { toEventInfo } from '@/features/events/transformers/eventTransformer';
import { logger } from '@/shared';
import { getAuthIdOrThrow } from '@/shared/utils/auth-helpers';

export async function updateEvent(
  supabase: SupabaseClient<Database>,
  updateData: Partial<EventData> & { id: string },
): Promise<EventInfo | null> {
  logger.debug('📅 API: Updating event', {
    id: updateData.id,
    title: updateData.title,
  });

  try {
    await getAuthIdOrThrow(supabase);

    const { id, ...updates } = updateData;
    const dbData = forDbUpdate(updates);

    const { data, error } = await supabase
      .from('events')
      .update(dbData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('📅 API: Failed to update event', { error, updateData });
      throw error;
    }

    if (!data) {
      logger.debug('📅 API: Event not found for update', {
        id: updateData.id,
      });
      return null;
    }

    const eventInfo = toEventInfo(data);

    logger.debug('📅 API: Successfully updated event', {
      id: eventInfo.id,
      title: eventInfo.title,
    });
    return eventInfo;
  } catch (error) {
    logger.error('📅 API: Error updating event', { error, updateData });
    throw error;
  }
}