import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@belongnetwork/core';
import { logger } from '@belongnetwork/core';
import type {
  Community,
  CreateCommunityData,
  UpdateCommunityData,
  User,
} from '@belongnetwork/types';
import {
  CommunityRow,
  toDomainCommunity,
} from './transformers/communityTransformer';
import { AUTH_ERROR_MESSAGES } from './auth';

// Community service error message constants
export const COMMUNITY_ERROR_MESSAGES = {
  /** Error thrown when user must be authenticated to create communities */
  AUTHENTICATION_REQUIRED_CREATE: AUTH_ERROR_MESSAGES.AUTHENTICATION_REQUIRED,
  /** Error thrown when user must be authenticated to update communities */
  AUTHENTICATION_REQUIRED_UPDATE: AUTH_ERROR_MESSAGES.AUTHENTICATION_REQUIRED,
  /** Error thrown when user must be authenticated to delete communities */
  AUTHENTICATION_REQUIRED_DELETE: AUTH_ERROR_MESSAGES.AUTHENTICATION_REQUIRED,
} as const;

// Data functions (pure async functions)
export async function fetchCommunities(): Promise<Community[]> {
  logger.debug('🏘️ API: Fetching communities');

  try {
    const { data, error } = await supabase
      .from('communities')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('🏘️ API: Failed to fetch communities', { error });
      throw error;
    }

    const communities: Community[] = (data || []).map((dbCommunity) =>
      toDomainCommunity(dbCommunity)
    );

    logger.debug('🏘️ API: Successfully fetched communities', {
      count: communities.length,
    });
    return communities;
  } catch (error) {
    logger.error('🏘️ API: Error fetching communities', { error });
    throw error;
  }
}

export async function fetchCommunityById(
  id: string
): Promise<Community | null> {
  logger.debug('🏘️ API: Fetching community by ID', { id });

  try {
    const { data, error } = await supabase
      .from('communities')
      .select('*')
      .eq('id', id)
      .single();

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
    });
    return community;
  } catch (error) {
    logger.error('🏘️ API: Error fetching community by ID', { id, error });
    throw error;
  }
}

export async function createCommunity(
  data: CreateCommunityData
): Promise<Community> {
  logger.debug('🏘️ API: Creating community', { name: data.name });

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error(COMMUNITY_ERROR_MESSAGES.AUTHENTICATION_REQUIRED_CREATE);
    }

    const communityData = {
      ...data,
      organizer_id: user.id,
      center: data.center
        ? `POINT(${data.center.lng} ${data.center.lat})`
        : null,
      level: 'neighborhood', // Default level
      member_count: 1,
    };

    const { data: newCommunity, error } = await supabase
      .from('communities')
      .insert(communityData)
      .select('*')
      .single();

    if (error) {
      logger.error('🏘️ API: Failed to create community', { error });
      throw error;
    }

    const community = toDomainCommunity(newCommunity);
    logger.info('🏘️ API: Successfully created community', {
      id: community.id,
      name: community.name,
    });
    return community;
  } catch (error) {
    logger.error('🏘️ API: Error creating community', { error });
    throw error;
  }
}

export async function updateCommunity(
  data: UpdateCommunityData
): Promise<Community> {
  logger.debug('🏘️ API: Updating community', { id: data.id });

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error(COMMUNITY_ERROR_MESSAGES.AUTHENTICATION_REQUIRED_UPDATE);
    }

    const updateData = {
      ...data,
      center: data.center
        ? `POINT(${data.center.lng} ${data.center.lat})`
        : undefined,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedCommunity, error } = await supabase
      .from('communities')
      .update(updateData)
      .eq('id', data.id)
      .eq('organizer_id', user.id) // Ensure user owns the community
      .select('*')
      .single();

    if (error) {
      logger.error('🏘️ API: Failed to update community', { error });
      throw error;
    }

    const community = toDomainCommunity(updatedCommunity);
    logger.info('🏘️ API: Successfully updated community', {
      id: community.id,
      name: community.name,
    });
    return community;
  } catch (error) {
    logger.error('🏘️ API: Error updating community', { error });
    throw error;
  }
}

export async function deleteCommunity(id: string): Promise<void> {
  logger.debug('🏘️ API: Deleting community', { id });

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error(COMMUNITY_ERROR_MESSAGES.AUTHENTICATION_REQUIRED_DELETE);
    }

    const { error } = await supabase
      .from('communities')
      .delete()
      .eq('id', id)
      .eq('organizer_id', user.id); // Ensure user owns the community

    if (error) {
      logger.error('🏘️ API: Failed to delete community', { error });
      throw error;
    }

    logger.info('🏘️ API: Successfully deleted community', { id });
  } catch (error) {
    logger.error('🏘️ API: Error deleting community', { error });
    throw error;
  }
}

// React Query hooks
export function useCommunities() {
  return useQuery({
    queryKey: ['communities'],
    queryFn: fetchCommunities,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useCommunity(id: string) {
  return useQuery({
    queryKey: ['communities', id],
    queryFn: () => fetchCommunityById(id),
    enabled: !!id,
  });
}

export function useCreateCommunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCommunity,
    onSuccess: (newCommunity) => {
      // Invalidate and refetch communities list
      queryClient.invalidateQueries({ queryKey: ['communities'] });

      // Add the new community to the cache
      queryClient.setQueryData(['communities', newCommunity.id], newCommunity);

      logger.info('🏘️ API: Community created successfully', {
        id: newCommunity.id,
      });
    },
    onError: (error) => {
      logger.error('🏘️ API: Failed to create community', { error });
    },
  });
}

export function useUpdateCommunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCommunity,
    onSuccess: (updatedCommunity) => {
      // Invalidate and refetch communities list
      queryClient.invalidateQueries({ queryKey: ['communities'] });

      // Update the specific community in cache
      queryClient.setQueryData(
        ['communities', updatedCommunity.id],
        updatedCommunity
      );

      logger.info('🏘️ API: Community updated successfully', {
        id: updatedCommunity.id,
      });
    },
    onError: (error) => {
      logger.error('🏘️ API: Failed to update community', { error });
    },
  });
}

export function useDeleteCommunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCommunity,
    onSuccess: (_, deletedId) => {
      // Invalidate and refetch communities list
      queryClient.invalidateQueries({ queryKey: ['communities'] });

      // Remove the community from cache
      queryClient.removeQueries({ queryKey: ['communities', deletedId] });

      logger.info('🏘️ API: Community deleted successfully', { id: deletedId });
    },
    onError: (error) => {
      logger.error('🏘️ API: Failed to delete community', { error });
    },
  });
}
