import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { EventData, EventInfo } from '@/features/events';
import { forDbInsert } from '@/features/events/transformers/eventTransformer';
import { toEventInfo } from '@/features/events/transformers/eventTransformer';
import { EventRow } from '../types/database';
import { commitImageUrls } from '@/features/images/api/imageCommit';

export async function createEvent(
  supabase: SupabaseClient<Database>,
  eventData: EventData,
): Promise<EventInfo | null> {
  const dbData = forDbInsert(eventData);

  const { data, error } = (await supabase
    .from('events')
    .insert(dbData)
    .select()
    .single()) as { data: EventRow; error: QueryError | null };

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create event');
  }

  // Auto-commit any temporary image URLs after event creation
  if (eventData.imageUrls && eventData.imageUrls.length > 0) {
    try {
      const permanentUrls = await commitImageUrls({
        supabase,
        imageUrls: eventData.imageUrls,
        entityType: 'event',
        entityId: data.id,
      });
      
      // Update event with permanent URLs if they changed
      if (JSON.stringify(permanentUrls) !== JSON.stringify(eventData.imageUrls)) {
        const { updateEvent } = await import('./updateEvent');
        const updatedEvent = await updateEvent(supabase, {
          id: data.id,
          imageUrls: permanentUrls,
        });
        if (updatedEvent) {
          return updatedEvent;
        }
      }
    } catch (error) {
      throw new Error(`Failed to commit event images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return toEventInfo(data);
}