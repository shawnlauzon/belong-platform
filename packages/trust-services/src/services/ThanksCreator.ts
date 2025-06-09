import { supabase, eventBus, logger, logApiCall, logApiResponse } from '@belongnetwork/core';
import type { Thanks, AppEvent } from '@belongnetwork/core';

export class ThanksCreator {
  private static initialized = false;

  static initialize(): void {
    if (this.initialized) {
      logger.debug('➕ ThanksCreator: Already initialized, skipping...');
      return;
    }

    logger.info('🚀 ThanksCreator: Initializing...');

    eventBus.on('thanks.create.requested', (event: AppEvent) => {
      if (event.type !== 'thanks.create.requested') {
        logger.error('➕ ThanksCreator: Received invalid event type', { event });
        return;
      }

      logger.debug('➕ ThanksCreator: Create requested', { thanksData: event.data });
      this._createThanks(event.data);
    });

    this.initialized = true;
    logger.info('✅ ThanksCreator: Initialized successfully');
  }

  private static async _createThanks(thanksData: any): Promise<void> {
    logger.debug('➕ ThanksCreator: Starting thanks creation', { thanksData });

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User must be authenticated to create thanks');
      }

      const insertData = {
        from_user_id: user.id,
        to_user_id: thanksData.to_user_id,
        resource_id: thanksData.resource_id,
        message: thanksData.message,
        image_urls: thanksData.image_urls || [],
        impact_description: thanksData.impact_description,
      };

      logApiCall('POST', 'supabase/thanks', insertData);

      const { data, error } = await supabase
        .from('thanks')
        .insert([insertData])
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
        .single();

      if (error) {
        logApiResponse('POST', 'supabase/thanks', null, error);
        throw new Error(`Failed to create thanks: ${error.message}`);
      }

      if (!data) {
        logApiResponse('POST', 'supabase/thanks', null, 'No data returned');
        throw new Error('Failed to create thanks: No data returned');
      }

      // Transform the response to match our Thanks interface
      const fromUser = data.from_user;
      const toUser = data.to_user;
      const resource = data.resource;

      const createdThanks: Thanks = {
        id: data.id,
        from_user_id: data.from_user_id,
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
        to_user_id: data.to_user_id,
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
        resource_id: data.resource_id,
        resource: resource ? {
          id: resource.id,
          creator_id: '',
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
        message: data.message,
        image_urls: data.image_urls || [],
        impact_description: data.impact_description,
        created_at: data.created_at,
      };

      logApiResponse('POST', 'supabase/thanks', { thanksId: createdThanks.id });
      logger.info('✅ ThanksCreator: Successfully created thanks', { 
        thanksId: createdThanks.id,
        message: createdThanks.message 
      });

      eventBus.emit('thanks.created', createdThanks);
    } catch (error) {
      logger.error('❌ ThanksCreator: Failed to create thanks', { error, thanksData });
      logApiResponse('POST', 'supabase/thanks', null, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      eventBus.emit('thanks.create.failed', { error: errorMessage });
    }
  }
}