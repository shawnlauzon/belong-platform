import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { ResourceResponseInfo, ResourceResponseStatus } from '../types';
import { ResourceResponseRow } from '../types/database';
import { logger } from '@/shared';

export interface FetchResourceResponsesParams {
  resourceId?: string;
  userId?: string;
  status?: ResourceResponseStatus;
}

export async function fetchResourceResponses(
  supabase: SupabaseClient<Database>,
  params: FetchResourceResponsesParams = {},
): Promise<ResourceResponseInfo[]> {
  logger.debug('📚 API: Fetching resource responses', params);

  let query = supabase
    .from('resource_responses')
    .select('*');

  if (params.resourceId) {
    query = query.eq('resource_id', params.resourceId);
  }

  if (params.userId) {
    query = query.eq('user_id', params.userId);
  }

  if (params.status) {
    query = query.eq('status', params.status);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    logger.error('📚 API: Failed to fetch resource responses', {
      error,
      params,
    });
    throw new Error(error.message || 'Failed to fetch resource responses');
  }

  const responses: ResourceResponseInfo[] = (data as ResourceResponseRow[]).map(row => ({
    resourceId: row.resource_id,
    userId: row.user_id,
    status: row.status as ResourceResponseStatus,
    createdAt: new Date(row.created_at || ''),
    updatedAt: new Date(row.updated_at || ''),
  }));

  logger.debug('📚 API: Successfully fetched resource responses', {
    count: responses.length,
    params,
  });

  return responses;
}