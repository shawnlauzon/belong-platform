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
      country: string;
      state: string;
      center?: Coordinates;
      radius_km?: number;
    }): Promise<Community> => {
      logger.debug('🏘️ useCreateCommunity: Creating community with hierarchy:', communityData);
      logApiCall('POST', '/communities/create-with-hierarchy', communityData);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User must be authenticated to create communities');
      }

      // Get existing communities to check what already exists
      const { data: existingCommunities, error: fetchError } = await supabase
        .from('communities')
        .select('*');

      if (fetchError) {
        throw fetchError;
      }

      const communities = existingCommunities || [];

      // Find or create the hierarchy: Worldwide -> Country -> State -> City/Neighborhood
      let worldwideId = communities.find(c => c.level === 'global')?.id;
      if (!worldwideId) {
        // This should exist from migration, but just in case
        const { data: worldwide, error: worldwideError } = await supabase
          .from('communities')
          .insert([{
            name: 'Worldwide',
            level: 'global',
            description: 'Global neighborhood connecting communities worldwide',
            parent_id: null,
            member_count: 1,
            creator_id: user.id,
          }])
          .select()
          .single();

        if (worldwideError) throw worldwideError;
        worldwideId = worldwide.id;
        logger.info('🏘️ Created Worldwide community:', { id: worldwideId });
      }

      // Find or create country
      let countryId = communities.find(c => 
        c.level === 'country' && 
        c.name === communityData.country
      )?.id;

      if (!countryId) {
        const { data: country, error: countryError } = await supabase
          .from('communities')
          .insert([{
            name: communityData.country,
            level: 'country',
            description: `${communityData.country} communities`,
            parent_id: worldwideId,
            member_count: 1,
            creator_id: user.id,
          }])
          .select()
          .single();

        if (countryError) throw countryError;
        countryId = country.id;
        logger.info('🏘️ Created country community:', { 
          id: countryId, 
          name: communityData.country 
        });
      }

      // Find or create state
      let stateId = communities.find(c => 
        c.level === 'state' && 
        c.name === communityData.state &&
        c.parent_id === countryId
      )?.id;

      if (!stateId) {
        const { data: state, error: stateError } = await supabase
          .from('communities')
          .insert([{
            name: communityData.state,
            level: 'state',
            description: `${communityData.state} communities`,
            parent_id: countryId,
            member_count: 1,
            creator_id: user.id,
          }])
          .select()
          .single();

        if (stateError) throw stateError;
        stateId = state.id;
        logger.info('🏘️ Created state community:', { 
          id: stateId, 
          name: communityData.state 
        });
      }

      // Create the actual community (city or neighborhood)
      const { data: community, error } = await supabase
        .from('communities')
        .insert([{
          name: communityData.name,
          level: communityData.level,
          description: communityData.description,
          parent_id: stateId,
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
        logApiResponse('POST', '/communities/create-with-hierarchy', null, error);
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

      logApiResponse('POST', '/communities/create-with-hierarchy', transformedCommunity);
      logger.info('✅ useCreateCommunity: Community created successfully with full hierarchy:', { 
        id: transformedCommunity.id, 
        name: transformedCommunity.name,
        country: communityData.country,
        state: communityData.state
      });

      return transformedCommunity;
    },
    onSuccess: () => {
      // Invalidate communities queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['communities'] });
    },
  });
}