import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

export async function renewResource(
  supabase: SupabaseClient<Database>,
  resourceId: string,
): Promise<void> {
  const { error } = await supabase
    .from('resources')
    .update({ 
      last_renewed_at: new Date().toISOString(),
      expires_at: null // Clear expires_at to trigger recalculation via trigger
    })
    .eq('id', resourceId);

  if (error) {
    throw error;
  }
}