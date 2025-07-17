import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { logger } from '@/shared';
import { getAuthIdOrThrow } from '@/shared/utils';

export async function deleteResource(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  const currentUserId = await getAuthIdOrThrow(supabase);

  // Verify user owns the resource
  const { data: resource } = await supabase
    .from('resources')
    .select('owner_id')
    .eq('id', id)
    .single();

  if (!resource) {
    logger.error('🏘️ API: Resource not found for deletion', {
      resourceId: id,
    });
    throw new Error('Resource not found');
  }

  if (resource.owner_id !== currentUserId) {
    logger.error('🏘️ API: User does not own resource for deletion', {
      userId: currentUserId,
      resourceId: id,
      resourceOwnerId: resource.owner_id,
    });
    throw new Error('Only resource owners can delete resources');
  }

  const { error } = await supabase.from('resources').delete().eq('id', id);

  if (error) {
    logger.error('🏘️ API: Failed to delete resource', {
      error,
      id,
    });
    throw new Error(error.message || 'Failed to delete resource');
  }

  logger.debug('🏘️ API: Successfully deleted resource', {
    id,
  });
}
