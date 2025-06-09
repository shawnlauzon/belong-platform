import {
  supabase,
  eventBus,
  logger,
  logApiCall,
  logApiResponse,
} from '@belongnetwork/core';
import type { AppEvent } from '@belongnetwork/core';

export class CommunityDeleter {
  private static initialized = false;

  static initialize(): void {
    if (this.initialized) {
      logger.debug('🗑️ CommunityDeleter: Already initialized, skipping...');
      return;
    }

    logger.info('🚀 CommunityDeleter: Initializing...');

    eventBus.on('community.delete.requested', (event: AppEvent) => {
      if (event.type !== 'community.delete.requested') {
        logger.error('🗑️ CommunityDeleter: Received invalid event type', {
          event,
        });
        return;
      }

      logger.debug('🗑️ CommunityDeleter: Delete requested', {
        communityId: event.data.communityId,
      });
      this._deleteCommunity(event.data.communityId);
    });

    this.initialized = true;
    logger.info('✅ CommunityDeleter: Initialized successfully');
  }

  private static async _deleteCommunity(communityId: string): Promise<void> {
    logger.debug('🗑️ CommunityDeleter: Starting community deletion', {
      communityId,
    });

    try {
      logApiCall('DELETE', `supabase/communities/${communityId}`);

      // First, verify the community exists and get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('User must be authenticated to delete communities');
      }

      // Check if the community exists and belongs to the current user
      const { data: existingCommunity, error: fetchError } = await supabase
        .from('communities')
        .select('id, creator_id, name')
        .eq('id', communityId)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          throw new Error('Community not found');
        }
        throw new Error(`Failed to verify community: ${fetchError.message}`);
      }

      if (!existingCommunity) {
        throw new Error('Community not found');
      }

      if (existingCommunity.creator_id !== user.id) {
        throw new Error('You can only delete your own communities');
      }

      // Perform the deletion
      const { error: deleteError } = await supabase
        .from('communities')
        .delete()
        .eq('id', communityId)
        .eq('creator_id', user.id); // Additional safety check

      if (deleteError) {
        logApiResponse(
          'DELETE',
          `supabase/communities/${communityId}`,
          null,
          deleteError
        );
        throw new Error(`Failed to delete community: ${deleteError.message}`);
      }

      logApiResponse('DELETE', `supabase/communities/${communityId}`, {
        success: true,
      });
      logger.info('✅ CommunityDeleter: Successfully deleted community', {
        communityId,
        name: existingCommunity.name,
      });

      eventBus.emit('community.deleted', { communityId });
    } catch (error) {
      logger.error('❌ CommunityDeleter: Failed to delete community', {
        error,
        communityId,
      });
      logApiResponse(
        'DELETE',
        `supabase/communities/${communityId}`,
        null,
        error
      );

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      eventBus.emit('community.delete.failed', { communityId, error: errorMessage });
    }
  }
}