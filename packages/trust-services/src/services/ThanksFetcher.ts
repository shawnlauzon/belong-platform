import { supabase, eventBus, logger, logApiCall, logApiResponse } from '@belongnetwork/core';
import type { Thanks, AppEvent } from '@belongnetwork/core';

export class ThanksFetcher {
  private static initialized = false;

  static initialize(): void {
    if (this.initialized) {
      logger.debug('🔄 ThanksFetcher: Already initialized, skipping...');
      return;
    }

    logger.info('🚀 ThanksFetcher: Initializing...');

    eventBus.on('thanks.fetch.requested', (event: AppEvent) => {
      if (event.type !== 'thanks.fetch.requested') {
        logger.error('🔄 ThanksFetcher: Received invalid event type', { event });
        return;
      }

      logger.debug('🔄 ThanksFetcher: Fetch requested', { filters: event.data.filters });
      this._fetchThanks(event.data.filters);
    });

    this.initialized = true;
    logger.info('✅ ThanksFetcher: Initialized successfully');
  }

  private static async _fetchThanks(filters?: any): Promise<void> {
    logger.debug('🔄 ThanksFetcher: Starting thanks fetch', { filters });

    try {
      logApiCall('GET', 'supabase/thanks', { filters });

      // Build the query
      let query = supabase
        .from('thanks')
        .select(`
          id,
          from_user_id,
          to_user_id,
          resource_id,
          message,
          image_urls,
          impact_description,
          created_at,
          from_user:profiles!thanks_from_user_id_fkey1 (
            id,
            email,
            user_metadata,
            created_at,
            updated_at
          ),
          to_user:profiles!thanks_to_user_id_fkey1 (
            id,
            email,
            user_metadata,
            created_at,
            updated_at
          ),
          resource:resources!thanks_resource_id_fkey (
            id,
            title,
            type,
            category
          )
        `)
        .order('created_at', { ascending: false });

      // Apply filters if provided
      if (filters) {
        if (filters.to_user_id) {
          query = query.eq('to_user_id', filters.to_user_id);
        }
        if (filters.from_user_id) {
          query = query.eq('from_user_id', filters.from_user_id);
        }
        if (filters.resource_id) {
          query = query.eq('resource_id', filters.resource_id);
        }
        if (filters.limit) {
          query = query.limit(filters.limit);
        }
        if (filters.offset) {
          query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
        }
      }

      const { data, error } = await query;

      if (error) {
        logApiResponse('GET', 'supabase/thanks', null, error);
        throw new Error(`Failed to fetch thanks: ${error.message}`);
      }

      if (!data) {
        logApiResponse('GET', 'supabase/thanks', { count: 0 });
        logger.warn('🔄 ThanksFetcher: No data returned from query');
        eventBus.emit('thanks.fetch.success', { thanks: [] });
        return;
      }

      // Transform the data to match our Thanks interface
      const thanks: Thanks[] = data.map((row: any) => {
        const fromUser = row.from_user;
        const toUser = row.to_user;
        const resource = row.resource;

        return {
          id: row.id,
          from_user_id: row.from_user_id,
          from_user: fromUser ? {
            id: fromUser.id,
            email: fromUser.email || '',
            first_name: fromUser.user_metadata?.first_name || '',
            last_name: fromUser.user_metadata?.last_name || '',
            full_name: fromUser.user_metadata?.full_name || 
                      fromUser.user_metadata?.first_name + ' ' + (fromUser.user_metadata?.last_name || '') ||
                      fromUser.email?.split('@')[0] || 
                      'Anonymous',
            avatar_url: fromUser.user_metadata?.avatar_url,
            location: fromUser.user_metadata?.location,
            address: fromUser.user_metadata?.address,
            created_at: fromUser.created_at,
            updated_at: fromUser.updated_at,
          } : undefined,
          to_user_id: row.to_user_id,
          to_user: toUser ? {
            id: toUser.id,
            email: toUser.email || '',
            first_name: toUser.user_metadata?.first_name || '',
            last_name: toUser.user_metadata?.last_name || '',
            full_name: toUser.user_metadata?.full_name || 
                      toUser.user_metadata?.first_name + ' ' + (toUser.user_metadata?.last_name || '') ||
                      toUser.email?.split('@')[0] || 
                      'Anonymous',
            avatar_url: toUser.user_metadata?.avatar_url,
            location: toUser.user_metadata?.location,
            address: toUser.user_metadata?.address,
            created_at: toUser.created_at,
            updated_at: toUser.updated_at,
          } : undefined,
          resource_id: row.resource_id,
          resource: resource ? {
            id: resource.id,
            creator_id: '', // Not needed for this context
            type: resource.type,
            category: resource.category,
            title: resource.title,
            description: '',
            image_urls: [],
            location: { lat: 0, lng: 0 },
            meetup_flexibility: 'home_only',
            is_active: true,
            times_helped: 0,
            created_at: new Date().toISOString(),
          } : undefined,
          message: row.message,
          image_urls: row.image_urls || [],
          impact_description: row.impact_description,
          created_at: row.created_at,
        };
      });

      logApiResponse('GET', 'supabase/thanks', { count: thanks.length });
      logger.info('✅ ThanksFetcher: Successfully fetched thanks', { count: thanks.length });

      eventBus.emit('thanks.fetch.success', { thanks });
    } catch (error) {
      logger.error('❌ ThanksFetcher: Failed to fetch thanks', { error });
      logApiResponse('GET', 'supabase/thanks', null, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      eventBus.emit('thanks.fetch.failed', { error: errorMessage });
    }
  }
}