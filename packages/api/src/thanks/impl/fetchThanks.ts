import { getBelongClient } from '@belongnetwork/core';
import type { Thanks, ThanksInfo, ThanksFilter } from '@belongnetwork/types';
import { toDomainThanks, toThanksInfo } from './thanksTransformer';
import { fetchUserById } from '../../users/impl/fetchUserById';
import { fetchResourceById } from '../../resources/impl/fetchResources';

export async function fetchThanks(
  filters?: ThanksFilter
): Promise<ThanksInfo[]> {
  const { supabase, logger } = getBelongClient();
  
  logger.debug('🙏 API: Fetching thanks', { filters });

  try {
    let query = supabase
      .from('thanks')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters if provided
    if (filters) {
      if (filters.sentBy) {
        query = query.eq('from_user_id', filters.sentBy);
      }
      if (filters.receivedBy) {
        query = query.eq('to_user_id', filters.receivedBy);
      }
      if (filters.resourceId) {
        query = query.eq('resource_id', filters.resourceId);
      }
    }

    const { data, error } = await query;

    if (error) {
      logger.error('🙏 API: Failed to fetch thanks', { error });
      throw error;
    }

    if (!data) {
      return [];
    }

    // For ThanksInfo[], we need to get communityId from resources but only fetch the ResourceInfo
    // We'll fetch resources to get their communityId
    const resourceIds = Array.from(new Set(data.map(t => t.resource_id)));
    
    // Fetch resources to get community IDs
    const resources = await Promise.all(resourceIds.map(id => fetchResourceById(id)));
    const resourceMap = new Map(resources.filter(Boolean).map(resource => [resource!.id, resource!]));

    const thanks = data
      .map((dbThanks) => {
        try {
          const fromUserId = dbThanks.from_user_id;
          const toUserId = dbThanks.to_user_id;
          const resourceId = dbThanks.resource_id;
          const resource = resourceMap.get(resourceId);
          
          if (!fromUserId || !toUserId || !resourceId || !resource) {
            logger.warn('🙏 API: Missing IDs or resource for thanks', {
              thanksId: dbThanks.id,
              fromUserId: dbThanks.from_user_id,
              toUserId: dbThanks.to_user_id,
              resourceId: dbThanks.resource_id,
              hasResource: !!resource,
            });
            return null;
          }

          // Get communityId from resource for safety
          const communityId = resource.community?.id || '';

          return toThanksInfo(dbThanks, fromUserId, toUserId, resourceId, communityId);
        } catch (error) {
          logger.error('🙏 API: Error transforming thanks', {
            thanksId: dbThanks.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          return null;
        }
      })
      .filter((thanks): thanks is ThanksInfo => thanks !== null);

    logger.debug('🙏 API: Successfully fetched thanks', {
      count: thanks.length,
    });
    return thanks;
  } catch (error) {
    logger.error('🙏 API: Error fetching thanks', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

export async function fetchThanksById(id: string): Promise<Thanks | null> {
  const { supabase, logger } = getBelongClient();
  logger.debug('🙏 API: Fetching thanks by ID', { id });

  try {
    const { data, error } = await supabase
      .from('thanks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        logger.debug('🙏 API: Thanks not found', { id });
        return null;
      }
      logger.error('🙏 API: Failed to fetch thanks by ID', {
        id,
        error: error.message,
        code: error.code,
      });
      throw error;
    }

    if (!data) {
      logger.debug('🙏 API: Thanks not found (null data)', { id });
      return null;
    }

    try {
      // Fetch users and resource separately
      const [fromUser, toUser, resource] = await Promise.all([
        fetchUserById(data.from_user_id),
        fetchUserById(data.to_user_id),
        fetchResourceById(data.resource_id)
      ]);

      if (!fromUser || !toUser || !resource) {
        logger.error('🙏 API: Missing dependencies for thanks', {
          id,
          fromUserId: data.from_user_id,
          toUserId: data.to_user_id,
          resourceId: data.resource_id,
          hasFromUser: !!fromUser,
          hasToUser: !!toUser,
          hasResource: !!resource,
        });
        throw new Error('Failed to load thanks dependencies');
      }

      const thanks = toDomainThanks(data, { fromUser, toUser, resource });
      logger.debug('🙏 API: Successfully fetched thanks by ID', {
        id,
        message: thanks.message.substring(0, 50) + '...',
      });
      return thanks;
    } catch (transformError) {
      logger.error('🙏 API: Error transforming thanks', {
        id,
        error:
          transformError instanceof Error
            ? transformError.message
            : 'Unknown error',
      });
      throw new Error('Failed to process thanks data');
    }
  } catch (error) {
    logger.error('🙏 API: Error fetching thanks by ID', {
      id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}