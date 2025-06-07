import { eventBus } from '@/core/eventBus';
import { supabase } from '@/lib/supabase';
import { Community, Coordinates } from '@/types';
import { logger, logApiCall, logApiResponse } from '@/lib/logger';

export class CommunityManager {
  static initialize() {
    logger.info('🏘️ CommunityManager: Initializing...');

    // Listen for community creation requests
    eventBus.on('community.create.requested', async (event) => {
      if (event.type !== 'community.create.requested') return;

      const communityData = event.data;
      logger.debug('🏘️ CommunityManager: Community creation requested:', communityData);
      
      try {
        const newCommunity = await this.createCommunityWithHierarchy(communityData);
        eventBus.emit('community.created', newCommunity);
      } catch (error) {
        logger.error('❌ CommunityManager: Error creating community:', error);
        eventBus.emit('community.create.failed', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });

    logger.info('✅ CommunityManager: Initialized');
  }

  static async createCommunityWithHierarchy(communityData: {
    name: string;
    level: Community['level'];
    description: string;
    country: string;
    state?: string;
    city: string;
    center?: Coordinates;
    radius_km?: number;
  }): Promise<Community> {
    logger.debug('🏘️ CommunityManager: Creating community with hierarchy:', communityData);
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

    // Find or create the hierarchy: Worldwide -> Country -> State (optional) -> City/Neighborhood
    let worldwideId = communities.find(c => c.level === 'global')?.id;
    if (!worldwideId) {
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

    // Find or create state (only if provided)
    let stateId = countryId; // Default parent is country
    
    if (communityData.state) {
      let existingStateId = communities.find(c => 
        c.level === 'state' && 
        c.name === communityData.state &&
        c.parent_id === countryId
      )?.id;

      if (!existingStateId) {
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
        existingStateId = state.id;
        logger.info('🏘️ Created state community:', { 
          id: existingStateId, 
          name: communityData.state 
        });
      }
      
      stateId = existingStateId;
    }

    // Find or create city if we're creating a neighborhood
    let cityId = stateId; // Default parent is state (or country if no state)
    
    if (communityData.level === 'neighborhood') {
      let existingCityId = communities.find(c => 
        c.level === 'city' && 
        c.name === communityData.city &&
        c.parent_id === stateId
      )?.id;

      if (!existingCityId) {
        const { data: city, error: cityError } = await supabase
          .from('communities')
          .insert([{
            name: communityData.city,
            level: 'city',
            description: `${communityData.city} community`,
            parent_id: stateId,
            member_count: 1,
            creator_id: user.id,
            radius_km: 25,
          }])
          .select()
          .single();

        if (cityError) throw cityError;
        existingCityId = city.id;
        logger.info('🏘️ Created city community:', { 
          id: existingCityId, 
          name: communityData.city 
        });
      }
      
      cityId = existingCityId;
    }

    // Create the actual community (city or neighborhood)
    const { data: community, error } = await supabase
      .from('communities')
      .insert([{
        name: communityData.name,
        level: communityData.level,
        description: communityData.description,
        parent_id: cityId,
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
    logger.info('✅ CommunityManager: Community created successfully with full hierarchy:', { 
      id: transformedCommunity.id, 
      name: transformedCommunity.name,
      country: communityData.country,
      state: communityData.state,
      city: communityData.city
    });

    return transformedCommunity;
  }
}