import { logger } from '@belongnetwork/core';
import type { Community, CommunityData, CommunityInfo, User } from '@belongnetwork/types';
import { MESSAGE_AUTHENTICATION_REQUIRED } from '../../constants';
import { toCommunityInfo, toDomainCommunity, forDbInsert } from '../impl/communityTransformer';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@belongnetwork/types/database';

export const createCommunityService = (supabase: SupabaseClient<Database>) => ({
  async fetchCommunities(options?: { includeDeleted?: boolean }): Promise<CommunityInfo[]> {

    logger.debug('🏘️ API: Fetching communities', { options });

    try {
      let query = supabase
        .from('communities')
        .select('*')
        .order('created_at', { ascending: false });

      // By default, only fetch active communities
      if (!options?.includeDeleted) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('🏘️ API: Failed to fetch communities', { error });
        throw error;
      }

      const communities: CommunityInfo[] = (data || []).map((dbCommunity) =>
        toCommunityInfo(dbCommunity)
      );

      logger.debug('🏘️ API: Successfully fetched communities', {
        count: communities.length,
        includeDeleted: options?.includeDeleted,
      });
      return communities;
    } catch (error) {
      logger.error('🏘️ API: Error fetching communities', { error });
      throw error;
    }
  },

  async fetchCommunityById(
    id: string,
    options?: { includeDeleted?: boolean }
  ): Promise<Community | null> {
    logger.debug('🏘️ API: Fetching community by ID', { id, options });

    try {
      let query = supabase
        .from('communities')
        .select('*, organizer:profiles!communities_organizer_id_fkey(*)')
        .eq('id', id);

      // By default, only fetch active communities
      if (!options?.includeDeleted) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query.single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Community not found
        }
        throw error;
      }

      const community = toDomainCommunity(data);
      logger.debug('🏘️ API: Successfully fetched community', {
        id,
        name: community.name,
        isActive: community.isActive,
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error(MESSAGE_AUTHENTICATION_REQUIRED);
      }

      const { data: newCommunity, error } = await supabase
        .from('communities')
        .insert(forDbInsert(data))
        .select('id')
        .single();

      if (error) {
        logger.error('🏘️ API: Failed to create community', { error });
        throw error;
      }

      // For now, return a simplified community object
      // In the future, we can fetch the full community with organizer data
      const organizer: User = { 
        id: data.organizerId, 
        email: '', 
        firstName: '', 
        lastName: '',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const community: Community = {
        id: newCommunity.id,
        name: data.name,
        description: data.description,
        level: data.level,
        timeZone: data.timeZone,
        organizer,
        parentId: data.parentId || null,
        hierarchyPath: data.hierarchyPath,
        memberCount: data.memberCount,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      logger.info('🏘️ API: Successfully created community', {
        id: community.id,
        name: community.name,
      });
      return community;
    } catch (error) {
      logger.error('🏘️ API: Error creating community', { error });
      throw error;
    }
  },

  async updateCommunity(updateData: Partial<CommunityData> & { id: string }): Promise<Community> {
    
    logger.debug('🏘️ API: Updating community', { id: updateData.id });

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error(MESSAGE_AUTHENTICATION_REQUIRED);
      }

      const { error } = await supabase
        .from('communities')
        .update({
          name: updateData.name,
          description: updateData.description,
          level: updateData.level,
          time_zone: updateData.timeZone,
          hierarchy_path: updateData.hierarchyPath ? JSON.stringify(updateData.hierarchyPath) : undefined,
        })
        .eq('id', updateData.id);

      if (error) {
        logger.error('🏘️ API: Failed to update community', { error });
        throw error;
      }

      // Return a simplified community object
      const organizer: User = { 
        id: user.id, 
        email: '', 
        firstName: '', 
        lastName: '',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const community: Community = {
        id: updateData.id,
        name: updateData.name || '',
        description: updateData.description,
        level: updateData.level || 'neighborhood',
        timeZone: updateData.timeZone || 'America/New_York',
        organizer,
        parentId: updateData.parentId || null,
        hierarchyPath: updateData.hierarchyPath || [],
        memberCount: updateData.memberCount || 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      logger.info('🏘️ API: Successfully updated community', {
        id: community.id,
        name: community.name,
      });
      return community;
    } catch (error) {
      logger.error('🏘️ API: Error updating community', { error });
      throw error;
    }
  },

  async deleteCommunity(id: string): Promise<{ success: boolean }> {
    
    logger.debug('🏘️ API: Deleting community', { id });

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error(MESSAGE_AUTHENTICATION_REQUIRED);
      }

      const { error } = await supabase
        .from('communities')
        .update({
          is_active: false,
          deleted_at: new Date().toISOString(),
          deleted_by: user.id,
        })
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
});