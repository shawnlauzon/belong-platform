import { logger } from '../../../shared';
import type {
  ShoutoutData,
  ShoutoutInfo,
  ShoutoutFilter,
  Shoutout,
} from '../types';
import {
  toDomainShoutout,
  toShoutoutInfo,
  forDbInsert,
  forDbUpdate,
} from '../transformers/shoutoutsTransformer';
import { fetchUserById } from '@/features/users/api';
import { fetchResourceById } from '../../resources/api/fetchResourceInfoById';
import { getAuthIdOrThrow } from '../../../shared/utils';
import { ERROR_CODES } from '../../../shared/constants';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../shared/types/database';
import { ShoutoutRow } from '../types/database';

/**
 * Validates shoutout creation business rules
 */
function validateShoutoutCreation(
  data: ShoutoutData,
  _currentUserId: string,
): void {
  // Rule: User cannot thank themselves
  if (data.fromUserId === data.toUserId) {
    throw new Error('Cannot thank yourself');
  }
}

/**
 * Validates shoutout update business rules
 */
function validateShoutoutUpdate(
  existingShoutout: ShoutoutRow,
  updateData: Partial<ShoutoutData>,
  _currentUserId: string,
): void {
  // Rule: Cannot change the sender of shoutout
  if (
    updateData.fromUserId &&
    updateData.fromUserId !== existingShoutout.from_user_id
  ) {
    throw new Error('Cannot change the sender of shoutout');
  }

  // Rule: Cannot change receiver to yourself (the sender)
  if (
    updateData.toUserId &&
    updateData.toUserId === existingShoutout.from_user_id
  ) {
    throw new Error('Cannot change receiver to yourself');
  }
}

export const createShoutoutsService = (supabase: SupabaseClient<Database>) => ({
  async fetchShoutouts(filters?: ShoutoutFilter): Promise<ShoutoutInfo[]> {
    logger.debug('📢 Shoutouts Service: Fetching shoutout', { filters });

    try {
      let query = supabase
        .from('shoutouts')
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
        logger.error('📢 Shoutouts Service: Failed to fetch shoutout', {
          error,
        });
        throw error;
      }

      if (!data) {
        return [];
      }

      // Convert to ShoutoutInfo objects
      const shoutout = data
        .map((dbShoutout) => {
          try {
            return toShoutoutInfo(
              dbShoutout,
              dbShoutout.from_user_id,
              dbShoutout.to_user_id,
              dbShoutout.resource_id,
            );
          } catch (error) {
            logger.error('📢 Shoutouts Service: Error transforming shoutout', {
              shoutoutId: dbShoutout.id,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            return null;
          }
        })
        .filter((shoutout): shoutout is ShoutoutInfo => shoutout !== null);

      // No filtering needed for soft deletes since they've been removed
      const filteredShoutouts = shoutout;

      logger.debug('📢 Shoutouts Service: Successfully fetched shoutout', {
        count: filteredShoutouts.length,
        totalFromDb: shoutout.length,
        filters,
      });

      return filteredShoutouts;
    } catch (error) {
      logger.error('📢 Shoutouts Service: Error fetching shoutout', {
        filters,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },

  async fetchShoutoutById(id: string): Promise<Shoutout | null> {
    logger.debug('📢 Shoutouts Service: Fetching shoutout by ID', {
      id,
    });

    try {
      let query = supabase.from('shoutouts').select('*').eq('id', id);

      const { data, error } = await query.single();

      if (error) {
        if (error.code === ERROR_CODES.NOT_FOUND) {
          // Not found
          logger.debug('📢 Shoutouts Service: Shoutout not found', { id });
          return null;
        }
        logger.error('📢 Shoutouts Service: Failed to fetch shoutout', {
          id,
          error,
        });
        throw error;
      }

      // Fetch fromUser, toUser, and resource using services
      const userService = createUserService(supabase);

      const [fromUser, toUser, resourceInfo] = await Promise.all([
        userService.fetchUserById(data.from_user_id),
        userService.fetchUserById(data.to_user_id),
        fetchResourceById(supabase, data.resource_id),
      ]);

      if (!fromUser || !toUser || !resourceInfo) {
        throw new Error('Required related entities not found');
      }

      // Fetch resource owner to assemble full Resource object
      const resourceOwner = await userService.fetchUserById(
        resourceInfo.ownerId,
      );
      if (!resourceOwner) {
        throw new Error('Resource owner not found');
      }

      // Assemble full Resource object from ResourceInfo
      const resource = {
        ...resourceInfo,
        owner: resourceOwner,
        community: undefined, // We can add community lookup if needed
      };

      const shoutout = toDomainShoutout(data, { fromUser, toUser, resource });

      // No soft delete check needed since columns were removed

      logger.debug('📢 Shoutouts Service: Successfully fetched shoutout', {
        id,
        fromUserId: shoutout.fromUser.id,
        toUserId: shoutout.toUser.id,
        resourceId: shoutout.resource.id,
      });

      return shoutout;
    } catch (error) {
      logger.error('📢 Shoutouts Service: Error fetching shoutout', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },

  async createShoutout(data: ShoutoutData): Promise<Shoutout> {
    logger.debug('📢 Shoutouts Service: Creating shoutout', { data });

    try {
      // Get current user
      const userId = await getAuthIdOrThrow(supabase, 'create shoutout');

      // Validate business rules before database operation
      validateShoutoutCreation(data, userId);

      // Transform to database format
      const dbShoutout = forDbInsert(data, userId);

      // Insert into database
      const { data: createdShoutout, error } = await supabase
        .from('shoutouts')
        .insert([dbShoutout])
        .select('*')
        .single();

      if (error) {
        logger.error('📢 Shoutouts Service: Failed to create shoutout', {
          error,
        });
        throw error;
      }

      // Fetch fromUser, toUser, and resource from cache
      const userService = createUserService(supabase);

      const [fromUser, toUser, resourceInfo] = await Promise.all([
        userService.fetchUserById(createdShoutout.from_user_id),
        userService.fetchUserById(createdShoutout.to_user_id),
        fetchResourceById(supabase, createdShoutout.resource_id),
      ]);

      if (!fromUser || !toUser || !resourceInfo) {
        throw new Error('Required related entities not found');
      }

      // Fetch resource owner to assemble full Resource object
      const resourceOwner = await userService.fetchUserById(
        resourceInfo.ownerId,
      );
      if (!resourceOwner) {
        throw new Error('Resource owner not found');
      }

      // Assemble full Resource object from ResourceInfo
      const resource = {
        ...resourceInfo,
        owner: resourceOwner,
        community: undefined, // We can add community lookup if needed
      };

      const shoutout = toDomainShoutout(createdShoutout, {
        fromUser,
        toUser,
        resource,
      });

      logger.info('📢 Shoutouts Service: Successfully created shoutout', {
        id: shoutout.id,
        fromUserId: shoutout.fromUser.id,
        toUserId: shoutout.toUser.id,
        resourceId: shoutout.resource.id,
      });

      return shoutout;
    } catch (error) {
      logger.error('📢 Shoutouts Service: Error creating shoutout', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },

  async updateShoutout(
    id: string,
    data: Partial<ShoutoutData>,
  ): Promise<Shoutout> {
    logger.debug('📢 Shoutouts Service: Updating shoutout', { id, data });

    try {
      // Get current user
      const userId = await getAuthIdOrThrow(supabase, 'update shoutout');

      // Fetch existing shoutout to validate business rules
      const { data: existingShoutout, error: fetchError } = await supabase
        .from('shoutouts')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        if (fetchError.code === ERROR_CODES.NOT_FOUND) {
          logger.debug('📢 Shoutouts Service: Shoutout not found for update', {
            id,
          });
          throw new Error('Shoutout not found');
        }
        logger.error(
          '📢 Shoutouts Service: Failed to fetch shoutout for update',
          {
            id,
            error: fetchError,
          },
        );
        throw fetchError;
      }

      // Validate business rules before database operation
      validateShoutoutUpdate(existingShoutout, data, userId);

      // Transform to database format
      const dbUpdate = forDbUpdate(data);

      // Update in database
      const { data: updatedShoutout, error } = await supabase
        .from('shoutouts')
        .update(dbUpdate)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        logger.error('📢 Shoutouts Service: Failed to update shoutout', {
          id,
          error,
        });
        throw error;
      }

      // Fetch fromUser, toUser, and resource from cache
      const userService = createUserService(supabase);

      const [fromUser, toUser, resourceInfo] = await Promise.all([
        userService.fetchUserById(updatedShoutout.from_user_id),
        userService.fetchUserById(updatedShoutout.to_user_id),
        fetchResourceById(supabase, updatedShoutout.resource_id),
      ]);

      if (!fromUser || !toUser || !resourceInfo) {
        throw new Error('Required related entities not found');
      }

      // Fetch resource owner to assemble full Resource object
      const resourceOwner = await userService.fetchUserById(
        resourceInfo.ownerId,
      );
      if (!resourceOwner) {
        throw new Error('Resource owner not found');
      }

      // Assemble full Resource object from ResourceInfo
      const resource = {
        ...resourceInfo,
        owner: resourceOwner,
        community: undefined, // We can add community lookup if needed
      };

      const shoutout = toDomainShoutout(updatedShoutout, {
        fromUser,
        toUser,
        resource,
      });

      logger.info('📢 Shoutouts Service: Successfully updated shoutout', {
        id: shoutout.id,
        message: shoutout.message,
      });

      return shoutout;
    } catch (error) {
      logger.error('📢 Shoutouts Service: Error updating shoutout', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },

  async deleteShoutout(id: string): Promise<void> {
    logger.debug('📢 Shoutouts Service: Deleting shoutout', { id });

    try {
      // Get current user
      const userId = await getAuthIdOrThrow(supabase, 'delete shoutout');

      // First, fetch the existing shoutout to verify ownership
      const { data: existingShoutout, error: fetchError } = await supabase
        .from('shoutouts')
        .select('from_user_id')
        .eq('id', id)
        .single();

      if (fetchError) {
        if (fetchError.code === ERROR_CODES.NOT_FOUND) {
          // Shoutout not found - we can consider this a success
          logger.debug(
            '📢 Shoutouts Service: Shoutout not found for deletion',
            {
              id,
            },
          );
          return;
        }

        logger.error(
          '📢 Shoutouts Service: Failed to fetch shoutout for deletion',
          {
            id,
            error: fetchError.message,
            code: fetchError.code,
          },
        );
        throw fetchError;
      }

      // Check if the current user is the sender
      if (existingShoutout.from_user_id !== userId) {
        logger.error(
          '📢 Shoutouts Service: User is not authorized to delete this shoutout',
          {
            userId,
            fromUserId: existingShoutout.from_user_id,
            shoutoutId: id,
          },
        );
        throw new Error('You are not authorized to delete this shoutout');
      }

      // Perform the hard delete
      const { error: deleteError } = await supabase
        .from('shoutouts')
        .delete()
        .eq('id', id);

      if (deleteError) {
        logger.error('📢 Shoutouts Service: Failed to delete shoutout', {
          id,
          error: deleteError.message,
          code: deleteError.code,
        });
        throw deleteError;
      }

      logger.info('📢 Shoutouts Service: Successfully deleted shoutout', {
        id,
      });
      return;
    } catch (error) {
      logger.error('📢 Shoutouts Service: Error deleting shoutout', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },
});
