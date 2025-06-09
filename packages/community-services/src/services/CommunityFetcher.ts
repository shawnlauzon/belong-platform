import {
  supabase,
  eventBus,
  logger,
  logApiCall,
  logApiResponse,
} from '@belongnetwork/core';
import type { Community, Coordinates, AppEvent } from '@belongnetwork/core';

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
        logger.error('🏘️ CommunityFetcher: Received invalid event type', {
          event,
        });
        return;
      }

      logger.debug('🏘️ CommunityFetcher: Fetch requested', {
        filters: event.data.filters,
      });
    });

    this._fetchCommunities();

    this.initialized = true;
    logger.info('✅ CommunityFetcher: Initialized successfully');
  }

  private static async _fetchCommunities(filters?: any): Promise<void> {
    logger.debug('🏘️ CommunityFetcher: Starting community fetch', { filters });

    try {
      logApiCall('GET', 'supabase/communities', { filters });

      // Build the query
      let query = supabase
        .from('communities')
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
          creator_id,
          created_at,
          updated_at
        `
        )
        .order('created_at', { ascending: false });

      // Apply filters if provided
      if (filters) {
        if (filters.level) {
          query = query.eq('level', filters.level);
        }
        if (filters.parent_id) {
          query = query.eq('parent_id', filters.parent_id);
        }
        if (filters.searchTerm) {
          query = query.or(
            `name.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%`
          );
        }
        if (filters.country) {
          // For country filter, we need to find communities with that name and level 'country'
          query = query
            .eq('level', 'country')
            .ilike('name', `%${filters.country}%`);
        }
        if (filters.state) {
          query = query
            .eq('level', 'state')
            .ilike('name', `%${filters.state}%`);
        }
        if (filters.city) {
          query = query.eq('level', 'city').ilike('name', `%${filters.city}%`);
        }
      }

      const { data, error } = await query;

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

      // Transform the data to match our Community interface
      const communities: Community[] = data.map((row: any) => {
        let center: Coordinates | undefined;

        // Parse the PostGIS POINT format: "POINT(lng lat)"
        if (row.center && typeof row.center === 'string') {
          const match = row.center.match(/POINT\(([^)]+)\)/);
          if (match) {
            const [lng, lat] = match[1].split(' ').map(Number);
            if (!isNaN(lng) && !isNaN(lat)) {
              center = { lat, lng };
            } else {
              logger.warn(
                '🏘️ CommunityFetcher: Invalid coordinates in center string',
                {
                  communityId: row.id,
                  centerString: row.center,
                }
              );
            }
          } else {
            logger.warn('🏘️ CommunityFetcher: Could not parse center string', {
              communityId: row.id,
              centerString: row.center,
            });
          }
        } else if (row.center && typeof row.center === 'object') {
          // Handle if center is already parsed as an object
          center = row.center;
        }

        return {
          id: row.id,
          name: row.name,
          level: row.level,
          parent_id: row.parent_id,
          description: row.description,
          center,
          radius_km: row.radius_km,
          member_count: row.member_count || 0,
        };
      });

      logApiResponse('GET', 'supabase/communities', {
        count: communities.length,
      });
      logger.info('✅ CommunityFetcher: Successfully fetched communities', {
        count: communities.length,
      });

      eventBus.emit('community.fetch.success', { communities });
    } catch (error) {
      logger.error('❌ CommunityFetcher: Failed to fetch communities', {
        error,
      });
      logApiResponse('GET', 'supabase/communities', null, error);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      eventBus.emit('community.fetch.failed', { error: errorMessage });
    }
  }
}
