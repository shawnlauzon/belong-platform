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
          from_member:profiles!thanks_from_user_id_fkey1 (
            id,
            email,
            user_metadata
          ),
          to_member:profiles!thanks_to_user_id_fkey1 (
            id,
            email,
            user_metadata
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
        const fromMember = row.from_member;
        const toMember = row.to_member;
        const resource = row.resource;

        return {
          id: row.id,
          from_member_id: row.from_user_id,
          from_member: fromMember ? {
            id: fromMember.id,
            name: fromMember.user_metadata?.full_name || 
                  fromMember.email?.split('@')[0] || 
                  'Anonymous',
            first_name: fromMember.user_metadata?.first_name,
            last_name: fromMember.user_metadata?.last_name,
            avatar_url: fromMember.user_metadata?.avatar_url,
            trust_score: 5.0, // Default trust score
            location: fromMember.user_metadata?.location || { lat: 0, lng: 0 },
            community_tenure_months: 0,
            thanks_received: 0,
            resources_shared: 0,
            created_at: new Date().toISOString(),
          } : undefined,
          to_member_id: row.to_user_id,
          to_member: toMember ? {
            id: toMember.id,
            name: toMember.user_metadata?.full_name || 
                  toMember.email?.split('@')[0] || 
                  'Anonymous',
            first_name: toMember.user_metadata?.first_name,
            last_name: toMember.user_metadata?.last_name,
            avatar_url: toMember.user_metadata?.avatar_url,
            trust_score: 5.0, // Default trust score
            location: toMember.user_metadata?.location || { lat: 0, lng: 0 },
            community_tenure_months: 0,
            thanks_received: 0,
            resources_shared: 0,
            created_at: new Date().toISOString(),
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