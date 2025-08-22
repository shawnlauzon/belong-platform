import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { fetchResourceById } from './fetchResourceById';
import type { Resource } from '../types';

export async function renewResource(
  supabase: SupabaseClient<Database>,
  resourceId: string,
): Promise<Resource> {
  const { error } = await supabase
    .from('resources')
    .update({ 
      last_renewed_at: new Date().toISOString(),
    })
    .eq('id', resourceId);

  if (error) {
    throw error;
  }

  // Fetch and return the updated resource
  const updatedResource = await fetchResourceById(supabase, resourceId);
  if (!updatedResource) {
    throw new Error('Failed to fetch updated resource after renewal');
  }

  return updatedResource;
}