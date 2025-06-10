import { supabase, eventBus, logger, logApiCall, logApiResponse } from '@belongnetwork/core';
import { toDomainCommunity, type CommunityRow } from '@belongnetwork/core/transformers';
import type { Community, AppEvent } from '@belongnetwork/core';

export class CommunityFetcher {
  private static initialized = false;

  static initialize(): void {
    if (this.initialized) {
      logger.debug('🏘️ CommunityFetcher: Already initialized, skipping...');
      return;
    }

    logger.info('🚀 CommunityFetcher: Initializing...');

    eventBus.on('community.fetch.requested', (event: AppEvent) => {
      if (event.type !== 'community.fetch.requested') {
        logger.error('🏘️ CommunityFetcher: Received invalid event type', { event });
        return;
      }

      logger.debug('🏘️ CommunityFetcher: Fetch requested');
      this._fetchCommunities();
    });

    this.initialized = true;
    logger.info('✅ CommunityFetcher: Initialized successfully');
  }

  private static async _fetchCommunities(): Promise<void> {
    logger.debug('🏘️ CommunityFetcher: Starting community fetch');

    try {
      logApiCall('GET', 'supabase/communities');

      // Fetch all communities from the database
      const { data, error } = await supabase
        .from('communities')
        .select(`
          id,
          name,
          level,
          parent_id,
          description,
          center,
          radius_km,
          member_count,
          creator_id,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });

      if (error) {
        logApiResponse('GET', 'supabase/communities', null, error);
        throw new Error(`Failed to fetch communities: ${error.message}`);
      }

      if (!data) {
        logApiResponse('GET', 'supabase/communities', { count: 0 });
        logger.warn('🏘️ CommunityFetcher: No data returned from query');
        eventBus.emit('community.fetch.success', { communities: [] });
        return;
      }

      // Create a map of all communities for parent lookup
      const allCommunitiesMap = new Map<string, CommunityRow>();
      data.forEach((community) => {
        allCommunitiesMap.set(community.id, community as CommunityRow);
      });

      // Transform each community using the transformer
      const communities: Community[] = data.map((row) => {
        return toDomainCommunity(row as CommunityRow, allCommunitiesMap);
      });

      logApiResponse('GET', 'supabase/communities', { count: communities.length });
      logger.info('✅ CommunityFetcher: Successfully fetched communities', { 
        count: communities.length 
      });

      eventBus.emit('community.fetch.success', { communities });
    } catch (error) {
      logger.error('❌ CommunityFetcher: Failed to fetch communities', { error });
      logApiResponse('GET', 'supabase/communities', null, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      eventBus.emit('community.fetch.failed', { error: errorMessage });
    }
  }
}