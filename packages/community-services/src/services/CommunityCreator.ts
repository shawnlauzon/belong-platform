import {
  supabase,
  eventBus,
  logger,
  logApiCall,
  logApiResponse,
} from '@belongnetwork/core';
import type { Community, AppEvent } from '@belongnetwork/core';

export class CommunityCreator {
  private static initialized = false;

  static initialize(): void {
    if (this.initialized) {
      logger.debug('➕ CommunityCreator: Already initialized, skipping...');
      return;
    }

    logger.info('🚀 CommunityCreator: Initializing...');

    eventBus.on('community.create.requested', (event: AppEvent) => {
      if (event.type !== 'community.create.requested') {
        logger.error('➕ CommunityCreator: Received invalid event type', {
          event,
        });
        return;
      }

      logger.debug('➕ CommunityCreator: Create requested', {
        communityData: event.data,
      });
      this._createCommunity(event.data);
    });

    this.initialized = true;
    logger.info('✅ CommunityCreator: Initialized successfully');
  }

  private static async _createCommunity(communityData: any): Promise<void> {
    logger.debug('➕ CommunityCreator: Starting community creation', {
      communityData,
    });

    try {
      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('User must be authenticated to create communities');
      }

      // Convert center from { lat, lng } to PostGIS POINT format if provided
      let centerPoint = null;
      if (communityData.center) {
        centerPoint = `POINT(${communityData.center.lng} ${communityData.center.lat})`;
      }

      const insertData = {
        name: communityData.name,
        level: communityData.level,
        description: communityData.description,
        center: centerPoint,
        radius_km: communityData.radius_km,
        creator_id: user.id,
        member_count: 1, // Creator is the first member
      };

      logApiCall('POST', 'supabase/communities', insertData);

      const { data, error } = await supabase
        .from('communities')
        .insert([insertData])
        .select(
          `
          id,
          name,
          level,
          parent_id,
          description,
          center,
          radius_km,
          member_count,
          created_at,
          updated_at
        `
        )
        .single();

      if (error) {
        logApiResponse('POST', 'supabase/communities', null, error);
        throw new Error(`Failed to create community: ${error.message}`);
      }

      if (!data) {
        logApiResponse('POST', 'supabase/communities', null, 'No data returned');
        throw new Error('Failed to create community: No data returned');
      }

      // Transform the response to match our Community interface
      let center = undefined;
      if (communityData.center) {
        center = {
          lat: communityData.center.lat,
          lng: communityData.center.lng,
        };
      }

      const createdCommunity: Community = {
        id: data.id,
        name: data.name,
        level: data.level,
        parent_id: data.parent_id,
        description: data.description,
        center,
        radius_km: data.radius_km,
        member_count: data.member_count || 1,
      };

      logApiResponse('POST', 'supabase/communities', {
        communityId: createdCommunity.id,
      });
      logger.info('✅ CommunityCreator: Successfully created community', {
        communityId: createdCommunity.id,
        name: createdCommunity.name,
      });

      eventBus.emit('community.created', createdCommunity);
    } catch (error) {
      logger.error('❌ CommunityCreator: Failed to create community', {
        error,
        communityData,
      });
      logApiResponse('POST', 'supabase/communities', null, error);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      eventBus.emit('community.create.failed', { error: errorMessage });
    }
  }
}