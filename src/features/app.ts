import { LocationManager } from './location/LocationManager';
import { eventBus } from '@/core/eventBus';
import { useAppStore } from '@/core/state';
import { TrustCalculator } from './trust/TrustCalculator';
import { ResourceManager } from './resources/ResourceManager';
import { logger, logEvent } from '@/lib/logger';

// Export managers for use in the app
export const locationManager = LocationManager;
export const trustCalculator = TrustCalculator;

// Initialize event listeners
export function initializeListeners() {
  logger.info('🎯 Initializing application event listeners...');
  
  // Initialize resource manager
  ResourceManager.initialize();

  // Listen for location updates
  eventBus.on('location.updated', (event) => {
    logger.debug('📍 Location updated:', event.data);
    useAppStore.getState().setUserLocation(event.data);
  });
  
  // Listen for community changes
  eventBus.on('community.changed', (event) => {
    const { communityId } = event.data;
    const community = useAppStore.getState().currentCommunity;
    
    logger.debug('🏘️ Community change requested:', { communityId, currentCommunityId: community.id });
    
    if (community.id !== communityId) {
      const { currentCommunity } = useAppStore.getState();
      useAppStore.getState().setCurrentCommunity(community);
      logger.info('🏘️ Community changed:', { from: currentCommunity.id, to: communityId });
    }
  });
  
  // Listen for view mode changes
  eventBus.on('view.changed', (event) => {
    const { view } = event.data;
    logger.debug('👁️ View mode changed:', { view });
    useAppStore.getState().setViewMode(view);
  });
  
  // Listen for thanks created (update trust scores)
  eventBus.on('thanks.created', async (event) => {
    logger.debug('🙏 Thanks created, updating trust score:', { toMemberId: event.data.to_member_id });
    
    try {
      // Update the recipient's trust score
      const newScore = await TrustCalculator.calculateScore(event.data.to_member_id);
      
      // Emit trust updated event
      eventBus.emit('trust.updated', {
        memberId: event.data.to_member_id,
        newScore
      });
      
      logger.info('✅ Trust score updated:', { memberId: event.data.to_member_id, newScore });
    } catch (error) {
      logger.error('❌ Error updating trust score:', error);
    }
  });
  
  logger.info('✅ Application event listeners initialized');
}