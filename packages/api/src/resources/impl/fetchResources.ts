import { supabase } from '@belongnetwork/core';
import { logger } from '@belongnetwork/core';
import type { Resource, ResourceFilter } from '@belongnetwork/types';
import { toDomainResource } from './resourceTransformer';
import { AUTH_ERROR_MESSAGES } from '../../auth';
import { fetchUserById } from '../../users/impl/fetchUserById';
import { fetchCommunityById } from '../../communities/impl/fetchCommunityById';

export async function fetchResources(
  filters?: ResourceFilter
): Promise<Resource[]> {
  logger.debug('📚 API: Fetching resources', { filters });

  try {
    let query = supabase
      .from('resources')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters if provided
    if (filters) {
      if (filters.communityId) {
        query = query.eq('community_id', filters.communityId);
      }
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      if (filters.ownerId) {
        query = query.eq('owner_id', filters.ownerId);
      }
      if (filters.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }
    }

    const { data, error } = await query;

    if (error) {
      logger.error('📚 API: Failed to fetch resources', { error });
      throw error;
    }

    if (!data) {
      return [];
    }

    // Get unique owner and community IDs to fetch
    const ownerIds = [...new Set(data.map(r => r.owner_id))];
    const communityIds = [...new Set(data.map(r => r.community_id))];

    // Fetch all required owners and communities
    const [owners, communities] = await Promise.all([
      Promise.all(ownerIds.map(id => fetchUserById(id))),
      Promise.all(communityIds.map(id => fetchCommunityById(id)))
    ]);

    // Create lookup maps
    const ownerMap = new Map(owners.filter(Boolean).map(owner => [owner!.id, owner!]));
    const communityMap = new Map(communities.filter(Boolean).map(community => [community!.id, community!]));

    const resources = data
      .map((dbResource) => {
        try {
          const owner = ownerMap.get(dbResource.owner_id);
          const community = communityMap.get(dbResource.community_id);
          
          if (!owner || !community) {
            logger.warn('📚 API: Missing owner or community for resource', {
              resourceId: dbResource.id,
              ownerId: dbResource.owner_id,
              communityId: dbResource.community_id,
              hasOwner: !!owner,
              hasCommunity: !!community,
            });
            return null;
          }

          return toDomainResource(dbResource, { owner, community });
        } catch (error) {
          logger.error('📚 API: Error transforming resource', {
            resourceId: dbResource.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          return null;
        }
      })
      .filter((resource): resource is Resource => resource !== null);

    logger.debug('📚 API: Successfully fetched resources', {
      count: resources.length,
    });
    return resources;
  } catch (error) {
    logger.error('📚 API: Error fetching resources', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

export async function fetchResourceById(id: string): Promise<Resource | null> {
  logger.debug('📚 API: Fetching resource by ID', { id });

  try {
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        logger.debug('📚 API: Resource not found', { id });
        return null;
      }
      logger.error('📚 API: Failed to fetch resource by ID', {
        id,
        error: error.message,
        code: error.code,
      });
      throw error;
    }

    if (!data) {
      logger.debug('📚 API: Resource not found (null data)', { id });
      return null;
    }

    try {
      // Fetch owner and community separately
      const [owner, community] = await Promise.all([
        fetchUserById(data.owner_id),
        fetchCommunityById(data.community_id)
      ]);

      if (!owner || !community) {
        logger.error('📚 API: Missing owner or community for resource', {
          id,
          ownerId: data.owner_id,
          communityId: data.community_id,
          hasOwner: !!owner,
          hasCommunity: !!community,
        });
        throw new Error('Failed to load resource dependencies');
      }

      const resource = toDomainResource(data, { owner, community });
      logger.debug('📚 API: Successfully fetched resource by ID', {
        id,
        title: resource.title,
        type: resource.type,
        category: resource.category,
      });
      return resource;
    } catch (transformError) {
      logger.error('📚 API: Error transforming resource', {
        id,
        error:
          transformError instanceof Error
            ? transformError.message
            : 'Unknown error',
      });
      throw new Error('Failed to process resource data');
    }
  } catch (error) {
    logger.error('📚 API: Error fetching resource by ID', {
      id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
