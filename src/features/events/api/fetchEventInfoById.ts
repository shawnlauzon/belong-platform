import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { EventInfo } from '@/features/events';
import type { EventRow } from '@/features/events/types/database';
import { toEventInfo } from '@/features/events/transformers/eventTransformer';

export async function fetchEventInfoById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<EventInfo | null> {
  const { data, error } = (await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single()) as { data: EventRow; error: QueryError | null };

  if (error || !data) {
    return null;
  }

  return toEventInfo(data);
}