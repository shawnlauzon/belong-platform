import { eventBus } from '@/core/eventBus';
import { supabase } from '@/lib/supabase';
import { logger, logApiCall, logApiResponse } from '@/lib/logger';

export class ProfileManager {
  static initialize() {
    logger.info('👤 ProfileManager: Initializing...');

    // Listen for profile update requests
    eventBus.on('profile.update.requested', async (event) => {
      if (event.type !== 'profile.update.requested') return;

      const { userId, metadata } = event.data;
      logger.debug('👤 ProfileManager: Profile update requested:', { userId, metadata });
      
      try {
        logApiCall('PATCH', `/profiles/${userId}`, { metadata });

        // First, fetch the current profile to get existing user_metadata
        const { data: currentProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('user_metadata')
          .eq('id', userId)
          .single();

        if (fetchError) {
          logApiResponse('GET', `/profiles/${userId}/metadata`, null, fetchError);
          throw fetchError;
        }

        // Merge the new metadata with existing user_metadata
        const existingMetadata = currentProfile?.user_metadata || {};
        const mergedMetadata = {
          ...existingMetadata,
          ...metadata
        };

        logger.debug('👤 ProfileManager: Merging metadata:', {
          userId,
          existingMetadata,
          newMetadata: metadata,
          mergedMetadata
        });

        const { error } = await supabase
          .from('profiles')
          .update({ user_metadata: mergedMetadata })
          .eq('id', userId);

        if (error) {
          logApiResponse('PATCH', `/profiles/${userId}`, null, error);
          throw error;
        }
        
        logApiResponse('PATCH', `/profiles/${userId}`, { success: true });
        logger.info('✅ ProfileManager: Profile updated successfully:', { userId });

        eventBus.emit('profile.updated', { userId, updatedProfile: mergedMetadata });
      } catch (error) {
        logger.error('❌ ProfileManager: Error updating profile:', error);
        eventBus.emit('profile.update.failed', { 
          userId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });

    logger.info('✅ ProfileManager: Initialized');
  }
}