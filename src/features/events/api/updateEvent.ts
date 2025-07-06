import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { EventData, EventInfo } from '@/features/events';
import { forDbUpdate } from '@/features/events/transformers/eventTransformer';
import { toEventInfo } from '@/features/events/transformers/eventTransformer';
import { EventRow } from '../types/database';

export async function updateEvent(
  supabase: SupabaseClient<Database>,
  id: string,
  updates: Partial<EventData>,
): Promise<EventInfo | null> {
  const dbData = forDbUpdate(updates);

  const { data, error } = (await supabase
    .from('events')
    .update(dbData)
    .eq('id', id)
    .select()
    .single()) as { data: EventRow; error: QueryError | null };

  if (error || !data) {
    throw new Error(error?.message || 'Failed to update event');
  }

  return toEventInfo(data);
}