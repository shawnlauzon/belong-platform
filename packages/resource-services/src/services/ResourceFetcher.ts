import {
  supabase,
  eventBus,
  logger,
  logApiCall,
  logApiResponse,
  isResourceFetchRequestedEvent,
  toDomainResource,
} from '@belongnetwork/core';
import type {
  AppEvent,
  ResourceFilter,
  ResourceRow,
} from '@belongnetwork/core';

export class ResourceFetcher {
  private static initialized = false;

  static initialize(): void {
    if (this.initialized) {
      logger.debug('🔄 ResourceFetcher: Already initialized, skipping...');
      return;
    }

    logger.info('🚀 ResourceFetcher: Initializing...');

    eventBus.on('resource.fetch.requested', (event: AppEvent) => {
      if (isResourceFetchRequestedEvent(event)) {
        logger.debug('🔄 ResourceFetcher: Fetch requested', {
          filters: event.data.filters,
        });
      }
    });

    this._fetchResources();

    this.initialized = true;
    logger.info('✅ ResourceFetcher: Initialized successfully');
  }

  private static async _fetchResources(
    filters?: ResourceFilter
  ): Promise<void> {
    logger.debug('🔄 ResourceFetcher: Starting resource fetch', { filters });

    try {
      logApiCall('GET', 'supabase/resources', { filters });

      // Build the query with owner join
      let query = supabase
        .from('resources')
        .select(
          `
          *,
          owner:profiles!resources_creator_id_fkey(
            id,
            email,
            user_metadata,
            created_at,
            updated_at
          )
        `
        )
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      // Apply filters if provided
      if (filters) {
        if (filters.category && filters.category !== 'all') {
          query = query.eq('category', filters.category);
        }
        if (filters.type && filters.type !== 'all') {
          query = query.eq('type', filters.type);
        }
        if (filters.searchTerm) {
          query = query.or(
            `title.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%`
          );
        }
      }

      const { data, error } = await query;

      if (error) {
        logApiResponse('error', 'GET', 'supabase/resources', error);
        throw error;
      }

      logApiResponse('success', 'GET', 'supabase/resources', data);

      // Transform database rows to domain models with proper typing
      const resources = (data as unknown as ResourceRow[]).map((row) =>
        toDomainResource(row)
      );

      logApiResponse('GET', 'supabase/resources', { count: resources.length });
      logger.info('✅ ResourceFetcher: Successfully fetched resources', {
        count: resources.length,
      });
      logger.debug(
        '🔄 ResourceFetcher: Emitting resource.fetch.success with resources:',
        resources
      );

      eventBus.emit('resource.fetch.success', { resources });
    } catch (error) {
      logger.error('❌ ResourceFetcher: Failed to fetch resources', { error });
      logApiResponse('GET', 'supabase/resources', null, error);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      eventBus.emit('resource.fetch.failed', { error: errorMessage });
    }
  }
}