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
      const fromMember = data.from_member;
      const toMember = data.to_member;
      const resource = data.resource;

      const updatedThanks: Thanks = {
        id: data.id,
        from_member_id: data.from_user_id,
        from_member: fromMember ? {
          id: fromMember.id,
          name: fromMember.user_metadata?.full_name || 
                fromMember.email?.split('@')[0] || 
                'Anonymous',
          first_name: fromMember.user_metadata?.first_name,
          last_name: fromMember.user_metadata?.last_name,
          avatar_url: fromMember.user_metadata?.avatar_url,
          trust_score: 5.0,
          location: fromMember.user_metadata?.location || { lat: 0, lng: 0 },
          community_tenure_months: 0,
          thanks_received: 0,
          resources_shared: 0,
          created_at: new Date().toISOString(),
        } : undefined,
        to_member_id: data.to_user_id,
        to_member: toMember ? {
          id: toMember.id,
          name: toMember.user_metadata?.full_name || 
                toMember.email?.split('@')[0] || 
                'Anonymous',
          first_name: toMember.user_metadata?.first_name,
          last_name: toMember.user_metadata?.last_name,
          avatar_url: toMember.user_metadata?.avatar_url,
          trust_score: 5.0,
          location: toMember.user_metadata?.location || { lat: 0, lng: 0 },
          community_tenure_months: 0,
          thanks_received: 0,
          resources_shared: 0,
          created_at: new Date().toISOString(),
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