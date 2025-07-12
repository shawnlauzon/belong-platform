import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { ResourceResponse } from '../types';
import { ResourceResponseRow } from '../types/resourceRow';
import { logger } from '@/shared';
import { getAuthIdOrThrow } from '@/shared/utils/auth-helpers';

export async function declineResource(
  supabase: SupabaseClient<Database>,
  resourceId: string,
): Promise<ResourceResponse | null> {
  logger.debug('📚 API: Declining resource', { resourceId });

  try {
    const currentUserId = await getAuthIdOrThrow(supabase);

    // Set status to 'declined' instead of deleting (unlike events)
    const { data, error } = (await supabase
      .from('resource_responses')
      .upsert(
        {
          resource_id: resourceId,
          user_id: currentUserId,
          status: 'declined',
        },
        { onConflict: 'resource_id,user_id' },
      )
      .select()
      .single()) as { data: ResourceResponseRow; error: QueryError | null };

    if (error) {
      logger.error('📚 API: Failed to decline resource', {
        error,
        resourceId,
      });
      throw error;
    }

    if (!data) {
      logger.error('📚 API: No data returned after declining resource');
      return null;
    }

    const response: ResourceResponse = {
      resourceId: data.resource_id,
      userId: data.user_id,
      status: data.status as 'accepted' | 'interested' | 'declined',
      createdAt: new Date(data.created_at || ''),
      updatedAt: new Date(data.updated_at || ''),
    };

    logger.debug('📚 API: Successfully declined resource', {
      resourceId,
      userId: currentUserId,
    });

    return response;
  } catch (error) {
    logger.error('📚 API: Error declining resource', {
      error,
      resourceId,
    });
    throw error;
  }
}
