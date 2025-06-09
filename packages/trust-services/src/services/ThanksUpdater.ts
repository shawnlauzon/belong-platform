import { supabase, eventBus, logger, logApiCall, logApiResponse } from '@belongnetwork/core';
import type { Thanks, AppEvent } from '@belongnetwork/core';

export class ThanksUpdater {
  private static initialized = false;

  static initialize(): void {
    if (this.initialized) {
      logger.debug('✏️ ThanksUpdater: Already initialized, skipping...');
      return;
    }

    logger.info('🚀 ThanksUpdater: Initializing...');

    eventBus.on('thanks.update.requested', (event: AppEvent) => {
      if (event.type !== 'thanks.update.requested') {
        logger.error('✏️ ThanksUpdater: Received invalid event type', { event });
        return;
      }

      logger.debug('✏️ ThanksUpdater: Update requested', { thanksData: event.data });
      this._updateThanks(event.data);
    });

    this.initialized = true;
    logger.info('✅ ThanksUpdater: Initialized successfully');
  }

  private static async _updateThanks(updateData: any): Promise<void> {
    logger.debug('✏️ ThanksUpdater: Starting thanks update', { 
      thanksId: updateData.id,
      updateData 
    });

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User must be authenticated to update thanks');
      }

      const { id, ...fieldsToUpdate } = updateData;

      logApiCall('PATCH', `supabase/thanks/${id}`, fieldsToUpdate);

      const { data, error } = await supabase
        .from('thanks')
        .update(fieldsToUpdate)
        .eq('id', id)
        .eq('from_user_id', user.id) // Ensure user can only update their own thanks
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
        logApiResponse('PATCH', `supabase/thanks/${id}`, null, error);
        throw new Error(`Failed to update thanks: ${error.message}`);
      }

      if (!data) {
        logApiResponse('PATCH', `supabase/thanks/${id}`, null, 'No data returned');
        throw new Error('Failed to update thanks: No data returned or you can only update your own thanks');
      }

      // Transform the response to match our Thanks interface
      const fromUser = data.from_user;
      const toUser = data.to_user;
      const resource = data.resource;

      const updatedThanks: Thanks = {
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

      logApiResponse('PATCH', `supabase/thanks/${id}`, { thanksId: updatedThanks.id });
      logger.info('✅ ThanksUpdater: Successfully updated thanks', { 
        thanksId: updatedThanks.id,
        message: updatedThanks.message 
      });

      eventBus.emit('thanks.updated', updatedThanks);
    } catch (error) {
      logger.error('❌ ThanksUpdater: Failed to update thanks', { 
        error, 
        thanksId: updateData.id 
      });
      logApiResponse('PATCH', `supabase/thanks/${updateData.id}`, null, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      eventBus.emit('thanks.update.failed', { error: errorMessage });
    }
  }
}