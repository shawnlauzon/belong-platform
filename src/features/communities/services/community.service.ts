import { logger } from '../../../shared';
import type {
  Community,
  CommunityData,
  CommunityFilter,
  CommunityInfo,
  CommunityMembership,
} from '../types';
import { requireAuthentication } from '../../../shared/utils/auth-helpers';
import { ERROR_CODES } from '../../../shared/constants';
import {
  toCommunityInfo,
  toDomainCommunity,
  forDbInsert,
  toDomainMembership,
} from '../transformers/communityTransformer';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../shared/types/database';
import { User } from '../../users';
import type { CommunityMembershipRow } from '../types/database';

/**
 * Applies community filters to a Supabase query
 * @param query - The Supabase query builder
 * @param filters - The filters to apply
 * @returns The query builder with filters applied
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const applyCommunityFilters = (query: any, filters: CommunityFilter) => {
  let filteredQuery = query;

  if (filters.name) {
    filteredQuery = filteredQuery.ilike('name', `%${filters.name}%`);
  }
  if (filters.level) {
    filteredQuery = filteredQuery.eq('level', filters.level);
  }
  if (filters.organizerId) {
    filteredQuery = filteredQuery.eq('organizer_id', filters.organizerId);
  }
  if (filters.parentId !== undefined) {
    if (filters.parentId === null) {
      filteredQuery = filteredQuery.is('parent_id', null);
    } else {
      filteredQuery = filteredQuery.eq('parent_id', filters.parentId);
    }
  }
  return filteredQuery;
};

export const createCommunityService = (supabase: SupabaseClient<Database>) => ({
  async fetchCommunities(filter?: CommunityFilter): Promise<CommunityInfo[]> {
    logger.debug('🏘️ API: Fetching communities', { filter });

    try {
      let query = supabase
        .from('communities')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply additional filters if provided
      if (filter) {
        query = applyCommunityFilters(query, filter);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('🏘️ API: Failed to fetch communities', { error });
        throw error;
      }

      const communities: CommunityInfo[] = (data || []).map((dbCommunity) =>
        toCommunityInfo(dbCommunity),
      );

      // Defensive application-level filtering as safety net
      const filteredCommunities = communities.filter((community) => {
        if (
          filter?.name &&
          !community.name.toLowerCase().includes(filter.name.toLowerCase())
        ) {
          return false;
        }
        if (filter?.level && community.level !== filter.level) {
          return false;
        }
        if (
          filter?.organizerId &&
          community.organizerId !== filter.organizerId
        ) {
          return false;
        }
        if (
          filter?.parentId !== undefined &&
          community.parentId !== filter.parentId
        ) {
          return false;
        }
        return true;
      });

      logger.debug('🏘️ API: Successfully fetched communities', {
        count: filteredCommunities.length,
        totalFromDb: communities.length,
        filter,
      });
      return filteredCommunities;
    } catch (error) {
      logger.error('🏘️ API: Error fetching communities', { error });
      throw error;
    }
  },

  async fetchCommunityById(id: string): Promise<Community | null> {
    logger.debug('🏘️ API: Fetching community by ID', { id });

    try {
      const query = supabase
        .from('communities')
        .select('*, organizer:profiles!communities_organizer_id_fkey(*)')
        .eq('id', id);

      const { data, error } = await query.single();

      if (error) {
        if (error.code === ERROR_CODES.NOT_FOUND) {
          return null; // Community not found
        }
        throw error;
      }

      const community = toDomainCommunity(data);

      logger.debug('🏘️ API: Successfully fetched community', {
        id,
        name: community.name,
      });
      return community;
    } catch (error) {
      logger.error('🏘️ API: Error fetching community by ID', { id, error });
      throw error;
    }
  },

  async createCommunity(data: CommunityData): Promise<Community> {
    logger.debug('🏘️ API: Creating community', { name: data.name });

    try {
      const currentUserId = await requireAuthentication(
        supabase,
        'create community',
      );
      if (data.organizerId !== currentUserId) {
        throw new Error('You must be the organizer of the community.');
      }

      const dbData = forDbInsert(data);
      console.log('dbData', dbData);

      const { data: newCommunity, error } = await supabase
        .from('communities')
        .insert(dbData)
        .select('*, organizer:profiles!communities_organizer_id_fkey(*)')
        .single();

      if (error) {
        logger.error('🏘️ API: Failed to create community', { error });
        throw error;
      }

      logger.info('🏘️ API: Successfully created community', {
        id: newCommunity.id,
        name: newCommunity.name,
      });

      // Automatically add organizer as a member with 'organizer' role
      try {
        const { error: membershipError } = await supabase
          .from('community_memberships')
          .insert({
            user_id: data.organizerId,
            community_id: newCommunity.id,
            role: 'admin',
          });

        if (membershipError) {
          logger.error('🏘️ API: Failed to add organizer as member', {
            error: membershipError,
            communityId: newCommunity.id,
            organizerId: data.organizerId,
          });
          // Don't throw here - community was created successfullyG
          // This is a non-critical error that can be fixed later
        } else {
          logger.info('🏘️ API: Successfully added organizer as member', {
            communityId: newCommunity.id,
            organizerId: data.organizerId,
          });
        }
      } catch (membershipError) {
        logger.error('🏘️ API: Error adding organizer as member', {
          error: membershipError,
          communityId: newCommunity.id,
          organizerId: data.organizerId,
        });
        // Don't throw here - community was created successfully
      }

      return toDomainCommunity(newCommunity);
    } catch (error) {
      logger.error('🏘️ API: Error creating community', { error });
      throw error;
    }
  },

  async updateCommunity(
    updateData: Partial<CommunityData> & { id: string },
  ): Promise<Community> {
    logger.debug('🏘️ API: Updating community', { id: updateData.id });

    try {
      const { data, error } = await supabase
        .from('communities')
        .update({
          name: updateData.name,
          description: updateData.description,
          level: updateData.level,
          time_zone: updateData.timeZone,
          hierarchy_path: updateData.hierarchyPath
            ? JSON.stringify(updateData.hierarchyPath)
            : undefined,
        })
        .eq('id', updateData.id)
        .select('*, organizer:profiles!communities_organizer_id_fkey(*)')
        .single();

      if (error) {
        logger.error('🏘️ API: Failed to update community', { error });
        throw error;
      }

      logger.info('🏘️ API: Successfully updated community', {
        id: data.id,
        name: data.name,
      });
      return toDomainCommunity(data);
    } catch (error) {
      logger.error('🏘️ API: Error updating community', { error });
      throw error;
    }
  },

  async deleteCommunity(id: string): Promise<{ success: boolean }> {
    logger.debug('🏘️ API: Deleting community', { id });

    try {
      await requireAuthentication(supabase, 'delete community');

      const { error } = await supabase
        .from('communities')
        .delete()
        .eq('id', id);

      if (error) {
        logger.error('🏘️ API: Failed to delete community', { error });
        throw error;
      }

      logger.info('🏘️ API: Successfully deleted community', { id });
      return { success: true };
    } catch (error) {
      logger.error('🏘️ API: Error deleting community', { error });
      throw error;
    }
  },

  async joinCommunity(
    communityId: string,
    role: 'member' | 'admin' | 'organizer' = 'member',
  ): Promise<CommunityMembership> {
    logger.debug('🏘️ API: Joining community', { communityId, role });

    try {
      // Get current user
      const userId = await requireAuthentication(supabase, 'join community');

      // Check if user is already a member
      const { data: existingMembership, error: checkError } = await supabase
        .from('community_memberships')
        .select('*')
        .eq('user_id', userId)
        .eq('community_id', communityId)
        .single();

      if (checkError && checkError.code !== ERROR_CODES.NOT_FOUND) {
        // ERROR_CODES.NOT_FOUND is "No rows found" - which is what we want
        logger.error('🏘️ API: Failed to check existing membership', {
          error: checkError,
        });
        throw checkError;
      }

      if (existingMembership) {
        logger.info('🏘️ API: User is already a member of this community', {
          userId,
          communityId,
        });
        throw new Error('User is already a member of this community');
      }

      // Transform to database format
      const dbMembership = {
        user_id: userId,
        community_id: communityId,
        role: role,
      };

      // Insert membership
      const { data: createdMembership, error } = await supabase
        .from('community_memberships')
        .insert([dbMembership])
        .select('user_id, community_id, role, joined_at')
        .single();

      if (error) {
        logger.error('🏘️ API: Failed to create community membership', {
          error,
        });
        throw error;
      }

      // Transform to domain model
      const membership = {
        id: `${createdMembership.user_id}-${createdMembership.community_id}`,
        userId: createdMembership.user_id,
        communityId: createdMembership.community_id,
        role: createdMembership.role as 'member' | 'admin' | 'organizer',
        joinedAt: new Date(createdMembership.joined_at),
      };

      logger.info('🏘️ API: Successfully joined community', {
        userId,
        communityId,
        role,
      });

      return membership;
    } catch (error) {
      logger.error('🏘️ API: Error joining community', { error, communityId });
      throw error;
    }
  },

  async leaveCommunity(communityId: string): Promise<CommunityMembership> {
    logger.debug('🏘️ API: Leaving community', { communityId });

    try {
      // Get current user
      const userId = await requireAuthentication(supabase, 'leave community');

      // First check if user is the organizer - they cannot leave their own community
      const { data: community, error: communityError } = await supabase
        .from('communities')
        .select('organizer_id')
        .eq('id', communityId)
        .single();

      if (communityError) {
        logger.error('🏘️ API: Failed to fetch community details', {
          error: communityError,
        });
        throw communityError;
      }

      if (community.organizer_id === userId) {
        logger.info('🏘️ API: Organizer cannot leave their own community', {
          userId,
          communityId,
        });
        throw new Error('Organizer cannot leave their own community');
      }

      // Then check if user is a member
      const { data: existingMembership, error: checkError } = await supabase
        .from('community_memberships')
        .select('*')
        .eq('user_id', userId)
        .eq('community_id', communityId)
        .single();

      if (checkError) {
        if (checkError.code === 'PGRST116') {
          // No rows found - user is not a member
          logger.info('🏘️ API: User is not a member of this community', {
            userId,
            communityId,
          });
          throw new Error('User is not a member of this community');
        }
        logger.error('🏘️ API: Failed to check existing membership', {
          error: checkError,
        });
        throw checkError;
      }

      // Delete membership
      const { error: deleteError } = await supabase
        .from('community_memberships')
        .delete()
        .eq('user_id', userId)
        .eq('community_id', communityId);

      if (deleteError) {
        logger.error('🏘️ API: Failed to delete community membership', {
          error: deleteError,
        });
        throw deleteError;
      }

      logger.info('🏘️ API: Successfully left community', {
        userId,
        communityId,
      });

      return toDomainMembership(existingMembership);
    } catch (error) {
      logger.error('🏘️ API: Error leaving community', { error, communityId });
      throw error;
    }
  },

  async fetchCommunityMemberships(
    communityId: string,
  ): Promise<CommunityMembership[]> {
    logger.debug('🏘️ API: Fetching community memberships', { communityId });

    try {
      const { data, error } = await supabase
        .from('community_memberships')
        .select('user_id, community_id, role, joined_at')
        .eq('community_id', communityId)
        .order('joined_at', { ascending: false });

      if (error) {
        logger.error('🏘️ API: Failed to fetch community memberships', {
          error,
        });
        throw error;
      }

      const memberships = (data || []).map(
        (dbMembership: CommunityMembershipRow) => ({
          id: `${dbMembership.user_id}-${dbMembership.community_id}`,
          userId: dbMembership.user_id,
          communityId: dbMembership.community_id,
          role: dbMembership.role as 'member' | 'admin' | 'organizer',
          joinedAt: new Date(dbMembership.joined_at),
        }),
      );

      logger.debug('🏘️ API: Successfully fetched community memberships', {
        communityId,
        count: memberships.length,
      });

      return memberships;
    } catch (error) {
      logger.error('🏘️ API: Error fetching community memberships', {
        error,
        communityId,
      });
      throw error;
    }
  },

  async fetchUserMemberships(userId?: string): Promise<CommunityMembership[]> {
    logger.debug('🏘️ API: Fetching user memberships', { userId });

    try {
      let targetUserId = userId;

      // If no userId provided, get current user
      if (!targetUserId) {
        targetUserId = await requireAuthentication(
          supabase,
          'fetch user communities',
        );
      }

      const { data, error } = await supabase
        .from('community_memberships')
        .select('user_id, community_id, role, joined_at')
        .eq('user_id', targetUserId)
        .order('joined_at', { ascending: false });

      if (error) {
        logger.error('🏘️ API: Failed to fetch user memberships', { error });
        throw error;
      }

      const memberships = (data || []).map(
        (dbMembership: CommunityMembershipRow) => ({
          id: `${dbMembership.user_id}-${dbMembership.community_id}`,
          userId: dbMembership.user_id,
          communityId: dbMembership.community_id,
          role: dbMembership.role as 'member' | 'admin' | 'organizer',
          joinedAt: new Date(dbMembership.joined_at),
        }),
      );

      logger.debug('🏘️ API: Successfully fetched user memberships', {
        userId: targetUserId,
        count: memberships.length,
      });

      return memberships;
    } catch (error) {
      logger.error('🏘️ API: Error fetching user memberships', {
        error,
        userId,
      });
      throw error;
    }
  },
});
