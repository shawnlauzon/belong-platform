import { logger } from '../../../shared';
import type {
  Resource,
  ResourceData,
  ResourceInfo,
  ResourceFilter,
} from '../types';
import {
  toDomainResource,
  toResourceInfo,
  forDbInsert,
  forDbUpdate,
} from '../transformers/resourceTransformer';
import { createUserService } from '../../users/services/user.service';
import { createCommunityService } from '../../communities/services/community.service';
import { requireAuthentication } from '../../../api/shared/auth-helpers';
import { ERROR_CODES } from '../../../api/constants';
import type {
  SupabaseClient,
  PostgrestFilterBuilder,
} from '@supabase/supabase-js';
import type { Database } from '../../../shared/types/database';

// Helper function to apply common filters to a query
const applyResourceFilters = (
  query: PostgrestFilterBuilder<any, any, unknown>,
  filters: ResourceFilter
) => {
  if (filters.communityId) {
    query = query.eq('community_id', filters.communityId);
  }
  if (filters.category && filters.category !== 'all') {
    query = query.eq('category', filters.category);
  }
  if (filters.type && filters.type !== 'all') {
    query = query.eq('type', filters.type);
  }
  if (filters.ownerId) {
    query = query.eq('owner_id', filters.ownerId);
  }
  return query;
};

// Helper function to build base query with activity filter
const buildResourceQuery = (
  supabase: SupabaseClient<Database>,
  isActive: boolean
) => {
  return supabase
    .from('resources')
    .select('*')
    .eq('is_active', isActive)
    .order('created_at', { ascending: false });
};

export const createResourceService = (supabase: SupabaseClient<Database>) => ({
  async fetchResources(filters?: ResourceFilter): Promise<ResourceInfo[]> {
    logger.debug('📚 API: Fetching resources', { filters });

    try {
      // CRITICAL FIX: Determine activity filter (defaults to active)
      const requestedActiveState = filters?.isActive !== false;

      // Build base query with activity filter
      let query = buildResourceQuery(supabase, requestedActiveState);

      // Apply additional filters if provided
      if (filters) {
        query = applyResourceFilters(query, filters);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('📚 API: Failed to fetch resources', { error });
        throw error;
      }

      if (!data) {
        return [];
      }

      // Convert to ResourceInfo objects
      const resources = data.map((dbResource) =>
        toResourceInfo(dbResource, dbResource.owner_id, dbResource.community_id)
      );

      // CRITICAL FIX: Defensive application-level filtering as safety net
      const expectedActiveState = filters?.isActive !== false;
      const filteredResources = resources.filter(
        (resource) => resource.isActive === expectedActiveState
      );

      logger.debug('📚 API: Successfully fetched resources', {
        count: filteredResources.length,
        totalFromDb: resources.length,
        expectedActiveState,
        filters,
      });

      return filteredResources;
    } catch (error) {
      logger.error('📚 API: Error fetching resources', {
        filters,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },

  async fetchResourceById(id: string): Promise<Resource | null> {
    logger.debug('📚 API: Fetching resource by ID', { id });

    try {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === ERROR_CODES.NOT_FOUND) {
          // Not found
          logger.debug('📚 API: Resource not found', { id });
          return null;
        }
        logger.error('📚 API: Failed to fetch resource', { id, error });
        throw error;
      }

      // Fetch owner and community using cache pattern
      const userService = createUserService(supabase);
      const communityService = createCommunityService(supabase);

      logger.debug('📚 API: About to fetch owner and community', {
        ownerId: data.owner_id,
        communityId: data.community_id,
      });

      const [owner, community] = await Promise.all([
        userService.fetchUserById(data.owner_id),
        data.community_id
          ? communityService.fetchCommunityById(data.community_id)
          : Promise.resolve(null),
      ]);

      logger.debug('📚 API: Completed fetching owner and community', {
        hasOwner: !!owner,
        hasCommunity: !!community,
      });

      if (!owner) {
        throw new Error('Owner not found');
      }

      const resource = toDomainResource(data, {
        owner,
        community: community || undefined,
      });

      logger.debug('📚 API: Successfully fetched resource', {
        id,
        ownerId: resource.owner.id,
        communityId: resource.community?.id,
      });

      return resource;
    } catch (error) {
      logger.error('📚 API: Error fetching resource', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },

  async createResource(data: ResourceData): Promise<Resource> {
    logger.debug('📚 API: Creating resource', {
      data: { ...data, location: 'REDACTED' },
    });

    try {
      // Get current user
      const userId = await requireAuthentication(supabase, 'create resource');

      // Transform to database format
      const dbResource = forDbInsert(data, userId);

      // Insert into database
      const { data: createdResource, error } = await supabase
        .from('resources')
        .insert([dbResource])
        .select('*')
        .single();

      if (error) {
        logger.error('📚 API: Failed to create resource', { error });
        throw error;
      }

      // Fetch owner and community from cache
      const userService = createUserService(supabase);
      const communityService = createCommunityService(supabase);

      const [owner, community] = await Promise.all([
        userService.fetchUserById(createdResource.owner_id),
        createdResource.community_id
          ? communityService.fetchCommunityById(createdResource.community_id)
          : Promise.resolve(null),
      ]);

      if (!owner) {
        throw new Error('Owner not found');
      }

      const resource = toDomainResource(createdResource, {
        owner,
        community: community || undefined,
      });

      logger.info('📚 API: Successfully created resource', {
        id: resource.id,
        title: resource.title,
        ownerId: resource.owner.id,
        communityId: resource.community?.id,
      });

      return resource;
    } catch (error) {
      logger.error('📚 API: Error creating resource', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },

  async updateResource(
    id: string,
    data: Partial<ResourceData>
  ): Promise<Resource> {
    logger.debug('📚 API: Updating resource', { id, data });

    try {
      // Get current user
      await requireAuthentication(supabase, 'update resource');

      // Transform to database format
      const dbUpdate = forDbUpdate(data);

      // Update in database
      const { data: updatedResource, error } = await supabase
        .from('resources')
        .update(dbUpdate)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        logger.error('📚 API: Failed to update resource', { id, error });
        throw error;
      }

      // Fetch owner and community from cache
      const userService = createUserService(supabase);
      const communityService = createCommunityService(supabase);

      const [owner, community] = await Promise.all([
        userService.fetchUserById(updatedResource.owner_id),
        updatedResource.community_id
          ? communityService.fetchCommunityById(updatedResource.community_id)
          : Promise.resolve(null),
      ]);

      if (!owner) {
        throw new Error('Owner not found');
      }

      const resource = toDomainResource(updatedResource, {
        owner,
        community: community || undefined,
      });

      logger.info('📚 API: Successfully updated resource', {
        id: resource.id,
        title: resource.title,
      });

      return resource;
    } catch (error) {
      logger.error('📚 API: Error updating resource', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },

  async deleteResource(id: string): Promise<void> {
    logger.debug('📚 Resource Service: Deleting resource', { id });

    try {
      logger.debug('📚 Resource Service: Starting delete operation', { id });
      // Get current user
      const userId = await requireAuthentication(supabase, 'delete resource');
      logger.debug('📚 Resource Service: Authenticated user', { id, userId });

      // First, fetch the existing resource to verify ownership
      logger.debug(
        '📚 Resource Service: Fetching resource for ownership check',
        { id }
      );
      const { data: existingResource, error: fetchError } = await supabase
        .from('resources')
        .select('owner_id, community_id')
        .eq('id', id)
        .single();

      logger.debug('📚 Resource Service: Fetch result', {
        id,
        hasResource: !!existingResource,
        fetchError: !!fetchError,
        errorCode: fetchError?.code,
      });

      if (fetchError) {
        if (fetchError.code === ERROR_CODES.NOT_FOUND) {
          // Resource not found - we can consider this a success
          logger.debug('📚 Resource Service: Resource not found for deletion', {
            id,
          });
          return;
        }

        logger.error(
          '📚 Resource Service: Failed to fetch resource for deletion',
          {
            id,
            error: fetchError.message,
            code: fetchError.code,
          }
        );
        throw fetchError;
      }

      // Check if the current user is the owner
      if (existingResource.owner_id !== userId) {
        logger.error(
          '📚 Resource Service: User is not authorized to delete this resource',
          {
            userId,
            ownerId: existingResource.owner_id,
            resourceId: id,
          }
        );
        throw new Error('You are not authorized to delete this resource');
      }

      // Perform the soft delete (set is_active to false)
      logger.debug('📚 Resource Service: Performing soft delete update', {
        id,
      });
      const { error: deleteError } = await supabase
        .from('resources')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      logger.debug('📚 Resource Service: Update result', {
        id,
        deleteError: !!deleteError,
      });

      if (deleteError) {
        logger.error('📚 Resource Service: Failed to delete resource', {
          id,
          error: deleteError.message,
          code: deleteError.code,
        });
        throw deleteError;
      }

      logger.info('📚 Resource Service: Successfully deleted resource', { id });
      logger.debug('📚 Resource Service: About to return from deleteResource', {
        id,
      });

      return;
    } catch (error) {
      logger.error('📚 Resource Service: Error deleting resource', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },
});
