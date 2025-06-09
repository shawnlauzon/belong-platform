import {
  supabase,
  eventBus,
  logger,
  logApiCall,
  logApiResponse,
} from '@belongnetwork/core';
import type { Community, AppEvent } from '@belongnetwork/core';

export class CommunityUpdater {
  private static initialized = false;

  static initialize(): void {
    if (this.initialized) {
      logger.debug('✏️ CommunityUpdater: Already initialized, skipping...');
      return;
    }

    logger.info('🚀 CommunityUpdater: Initializing...');

    eventBus.on('community.update.requested', (event: AppEvent) => {
      if (event.type !== 'community.update.requested') {
        logger.error('✏️ CommunityUpdater: Received invalid event type', {
          event,
        });
        return;
      }

      logger.debug('✏️ CommunityUpdater: Update requested', {
        communityData: event.data,
      });
      this._updateCommunity(event.data);
    });

    this.initialized = true;
    logger.info('✅ CommunityUpdater: Initialized successfully');
  }

  private static async _updateCommunity(updateData: any): Promise<void> {
    logger.debug('✏️ CommunityUpdater: Starting community update', {
      communityId: updateData.id,
      updateData,
    });

    try {
      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('User must be authenticated to update communities');
      }

      const { id, ...fieldsToUpdate } = updateData;

      // Convert center if it's being updated
      if (fieldsToUpdate.center && typeof fieldsToUpdate.center === 'object') {
        fieldsToUpdate.center = `POINT(${fieldsToUpdate.center.lng} ${fieldsToUpdate.center.lat})`;
      }

      // Add updated_at timestamp
      fieldsToUpdate.updated_at = new Date().toISOString();

      logApiCall('PATCH', `supabase/communities/${id}`, fieldsToUpdate);

      // Check if the community exists and belongs to the current user
      const { data: existingCommunity, error: fetchError } = await supabase
        .from('communities')
        .select('id, creator_id, name')
        .eq('id', id)
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
        throw new Error('You can only update your own communities');
      }

      const { data, error } = await supabase
        .from('communities')
        .update(fieldsToUpdate)
        .eq('id', id)
        .eq('creator_id', user.id) // Additional safety check
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
          created_at,
          updated_at
        `
        )
        .single();

      if (error) {
        logApiResponse('PATCH', `supabase/communities/${id}`, null, error);
        throw new Error(`Failed to update community: ${error.message}`);
      }

      if (!data) {
        logApiResponse(
          'PATCH',
          `supabase/communities/${id}`,
          null,
          'No data returned'
        );
        throw new Error('Failed to update community: No data returned');
      }

      // Transform the response to match our Community interface
      let center = undefined;

      // Parse the PostGIS POINT format: "POINT(lng lat)"
      if (data.center && typeof data.center === 'string') {
        const match = data.center.match(/POINT\(([^)]+)\)/);
        if (match) {
          const [lng, lat] = match[1].split(' ').map(Number);
          if (!isNaN(lng) && !isNaN(lat)) {
            center = { lat, lng };
          }
        }
      } else if (data.center && typeof data.center === 'object') {
        center = data.center;
      }

      const updatedCommunity: Community = {
        id: data.id,
        name: data.name,
        level: data.level,
        parent_id: data.parent_id,
        description: data.description,
        center,
        radius_km: data.radius_km,
        member_count: data.member_count || 0,
      };

      logApiResponse('PATCH', `supabase/communities/${id}`, {
        communityId: updatedCommunity.id,
      });
      logger.info('✅ CommunityUpdater: Successfully updated community', {
        communityId: updatedCommunity.id,
        name: updatedCommunity.name,
      });

      eventBus.emit('community.updated', updatedCommunity);
    } catch (error) {
      logger.error('❌ CommunityUpdater: Failed to update community', {
        error,
        communityId: updateData.id,
      });
      logApiResponse('PATCH', `supabase/communities/${updateData.id}`, null, error);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      eventBus.emit('community.update.failed', { error: errorMessage });
    }
  }
}