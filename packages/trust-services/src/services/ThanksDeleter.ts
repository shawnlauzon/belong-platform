import { supabase, eventBus, logger, logApiCall, logApiResponse } from '@belongnetwork/core';
import type { AppEvent } from '@belongnetwork/core';

export class ThanksDeleter {
  private static initialized = false;

  static initialize(): void {
    if (this.initialized) {
      logger.debug('🗑️ ThanksDeleter: Already initialized, skipping...');
      return;
    }

    logger.info('🚀 ThanksDeleter: Initializing...');

    eventBus.on('thanks.delete.requested', (event: AppEvent) => {
      if (event.type !== 'thanks.delete.requested') {
        logger.error('🗑️ ThanksDeleter: Received invalid event type', { event });
        return;
      }

      logger.debug('🗑️ ThanksDeleter: Delete requested', { thanksId: event.data.thanksId });
      this._deleteThanks(event.data.thanksId);
    });

    this.initialized = true;
    logger.info('✅ ThanksDeleter: Initialized successfully');
  }

  private static async _deleteThanks(thanksId: string): Promise<void> {
    logger.debug('🗑️ ThanksDeleter: Starting thanks deletion', { thanksId });

    try {
      logApiCall('DELETE', `supabase/thanks/${thanksId}`);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User must be authenticated to delete thanks');
      }

      // First, verify the thanks exists and belongs to the current user
      const { data: existingThanks, error: fetchError } = await supabase
        .from('thanks')
        .select('id, from_user_id, message')
        .eq('id', thanksId)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          throw new Error('Thanks not found');
        }
        throw new Error(`Failed to verify thanks: ${fetchError.message}`);
      }

      if (!existingThanks) {
        throw new Error('Thanks not found');
      }

      if (existingThanks.from_user_id !== user.id) {
        throw new Error('You can only delete your own thanks');
      }

      // Perform the deletion
      const { error: deleteError } = await supabase
        .from('thanks')
        .delete()
        .eq('id', thanksId)
        .eq('from_user_id', user.id); // Additional safety check

      if (deleteError) {
        logApiResponse('DELETE', `supabase/thanks/${thanksId}`, null, deleteError);
        throw new Error(`Failed to delete thanks: ${deleteError.message}`);
      }

      logApiResponse('DELETE', `supabase/thanks/${thanksId}`, { success: true });
      logger.info('✅ ThanksDeleter: Successfully deleted thanks', { 
        thanksId,
        message: existingThanks.message 
      });

      eventBus.emit('thanks.deleted', { thanksId });
    } catch (error) {
      logger.error('❌ ThanksDeleter: Failed to delete thanks', { error, thanksId });
      logApiResponse('DELETE', `supabase/thanks/${thanksId}`, null, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      eventBus.emit('thanks.delete.failed', { thanksId, error: errorMessage });
    }
  }
}