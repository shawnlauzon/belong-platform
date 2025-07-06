import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { EventData, EventInfo } from '@/features/events';
import { forDbInsert } from '@/features/events/transformers/eventTransformer';
import { toEventInfo } from '@/features/events/transformers/eventTransformer';
import { EventRow } from '../types/database';

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

  return toEventInfo(data);
}