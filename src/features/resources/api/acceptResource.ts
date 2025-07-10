import type { QueryError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { ResourceResponseInfo, ResourceResponseStatus } from '../types';
import { ResourceResponseRow } from '../types/database';
import { logger } from '@/shared';
import { getAuthIdOrThrow } from '@/shared/utils/auth-helpers';

// Helper function to check existing response
async function getExistingResponse(
  supabase: SupabaseClient<Database>,
  resourceId: string,
  userId: string,
): Promise<{ status: ResourceResponseStatus } | null> {
  const { data, error } = await supabase
    .from('resource_responses')
    .select('status')
    .eq('resource_id', resourceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    logger.error('📚 API: Failed to check existing response', {
      error,
      resourceId,
      userId,
    });
    throw error;
  }

  return data as { status: ResourceResponseStatus } | null;
}

// Helper function to save response
async function saveResponse(
  supabase: SupabaseClient<Database>,
  resourceId: string,
  userId: string,
  status: ResourceResponseStatus,
): Promise<ResourceResponseInfo | null> {
  const { data, error } = (await supabase
    .from('resource_responses')
    .upsert(
      { 
        resource_id: resourceId, 
        user_id: userId, 
        status 
      }, 
      { onConflict: 'resource_id,user_id' }
    )
    .select()
    .single()) as { data: ResourceResponseRow; error: QueryError | null };

  if (error) {
    logger.error('📚 API: Failed to save response', {
      error,
      resourceId,
      userId,
      status,
    });
    throw error;
  }

  if (!data) {
    logger.error('📚 API: No data returned after saving response');
    return null;
  }

  return {
    resourceId: data.resource_id,
    userId: data.user_id,
    status: data.status as ResourceResponseStatus,
    createdAt: new Date(data.created_at || ''),
    updatedAt: new Date(data.updated_at || ''),
  };
}

export async function acceptResource(
  supabase: SupabaseClient<Database>,
  resourceId: string,
  status: ResourceResponseStatus = 'accepted',
): Promise<ResourceResponseInfo | null> {
  logger.debug('📚 API: Accepting resource', { resourceId, status });

  try {
    const currentUserId = await getAuthIdOrThrow(supabase);

    // Check if user already has the same response
    const existingResponse = await getExistingResponse(
      supabase,
      resourceId,
      currentUserId,
    );

    if (existingResponse && existingResponse.status === status) {
      logger.warn('📚 API: User already has same response', {
        resourceId,
        userId: currentUserId,
        status,
      });
      throw new Error('Already responded to this resource with the same status');
    }

    const response = await saveResponse(supabase, resourceId, currentUserId, status);

    logger.debug('📚 API: Successfully accepted resource', {
      resourceId,
      userId: currentUserId,
      status,
    });

    return response;
  } catch (error) {
    logger.error('📚 API: Error accepting resource', {
      error,
      resourceId,
      status,
    });
    throw error;
  }
}