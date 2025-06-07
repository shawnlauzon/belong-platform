import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Community, Coordinates } from '@/types';
import { logger, logApiCall, logApiResponse } from '@/lib/logger';

export function useCommunities() {
  return useQuery({
    queryKey: ['communities'],
    queryFn: async (): Promise<Community[]> => {
      logger.debug('🏘️ useCommunities: Fetching all communities');
      logApiCall('GET', '/communities');

      const { data: communities, error } = await supabase
        .from('communities')
        .select('*')
        .order('level', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        logApiResponse('GET', '/communities', null, error);
        throw error;
      }

      if (!communities) {
        logApiResponse('GET', '/communities', []);
        return [];
      }

      // Transform the data to match our Community interface
      const transformedCommunities: Community[] = communities.map(community => ({
        id: community.id,
        name: community.name,
        level: community.level as Community['level'],
        parent_id: community.parent_id,
        description: community.description,
        center: community.center ? {
          lat: community.center.coordinates[1],
          lng: community.center.coordinates[0]
        } : undefined,
        radius_km: community.radius_km,
        member_count: community.member_count,
      }));

      logApiResponse('GET', '/communities', { count: transformedCommunities.length });
      logger.info('🏘️ useCommunities: Communities fetched successfully:', { 
        count: transformedCommunities.length 
      });

      return transformedCommunities;
    }
  });
}

export function useCommunity(id: string) {
  return useQuery({
    queryKey: ['communities', id],
    queryFn: async (): Promise<Community> => {
      logger.debug('🏘️ useCommunity: Fetching community:', { id });
      logApiCall('GET', `/communities/${id}`);

      const { data: community, error } = await supabase
        .from('communities')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        logApiResponse('GET', `/communities/${id}`, null, error);
        throw error;
      }

      if (!community) {
        throw new Error('Community not found');
      }

      const transformedCommunity: Community = {
        id: community.id,
        name: community.name,
        level: community.level as Community['level'],
        parent_id: community.parent_id,
        description: community.description,
        center: community.center ? {
          lat: community.center.coordinates[1],
          lng: community.center.coordinates[0]
        } : undefined,
        radius_km: community.radius_km,
        member_count: community.member_count,
      };

      logApiResponse('GET', `/communities/${id}`, transformedCommunity);
      logger.info('🏘️ useCommunity: Community fetched successfully:', { 
        id, 
        name: transformedCommunity.name 
      });

      return transformedCommunity;
    },
    enabled: !!id,
  });
}

export function useCreateCommunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (communityData: {
      name: string;
      level: Community['level'];
      description: string;
      parent_id?: string;
      center?: Coordinates;
      radius_km?: number;
    }): Promise<Community> => {
      logger.debug('🏘️ useCreateCommunity: Creating community:', communityData);
      logApiCall('POST', '/communities', communityData);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User must be authenticated to create communities');
      }

      const { data: community, error } = await supabase
        .from('communities')
        .insert([{
          name: communityData.name,
          level: communityData.level,
          description: communityData.description,
          parent_id: communityData.parent_id || null,
          center: communityData.center 
            ? `POINT(${communityData.center.lng} ${communityData.center.lat})`
            : null,
          radius_km: communityData.radius_km,
          creator_id: user.id,
          member_count: 1,
        }])
        .select()
        .single();

      if (error) {
        logApiResponse('POST', '/communities', null, error);
        throw error;
      }

      if (!community) {
        throw new Error('Failed to create community');
      }

      const transformedCommunity: Community = {
        id: community.id,
        name: community.name,
        level: community.level as Community['level'],
        parent_id: community.parent_id,
        description: community.description,
        center: community.center ? {
          lat: community.center.coordinates[1],
          lng: community.center.coordinates[0]
        } : undefined,
        radius_km: community.radius_km,
        member_count: community.member_count,
      };

      logApiResponse('POST', '/communities', transformedCommunity);
      logger.info('✅ useCreateCommunity: Community created successfully:', { 
        id: transformedCommunity.id, 
        name: transformedCommunity.name 
      });

      return transformedCommunity;
    },
    onSuccess: () => {
      // Invalidate communities queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['communities'] });
    },
  });
}