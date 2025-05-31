import { LocationManager } from './location/LocationManager';
import { eventBus } from '@/core/eventBus';
import { useAppStore } from '@/core/state';
import { TrustCalculator } from './trust/TrustCalculator';
import { ResourceManager } from './resources/ResourceManager';

// Export managers for use in the app
export const locationManager = LocationManager;
export const trustCalculator = TrustCalculator;

// Initialize event listeners
export function initializeListeners() {
  // Initialize resource manager
  ResourceManager.initialize();

  // Listen for location updates
  eventBus.on('location.updated', (data) => {
    useAppStore.getState().setUserLocation(data);
  });
  
  // Listen for community changes
  eventBus.on('community.changed', (data) => {
    const { communityId } = data;
    const community = useAppStore.getState().currentCommunity;
    
    if (community.id !== communityId) {
      const { currentCommunity } = useAppStore.getState();
      useAppStore.getState().setCurrentCommunity(community);
    }
  });
  
  // Listen for view mode changes
  eventBus.on('view.changed', (data) => {
    const { view } = data;
    useAppStore.getState().setViewMode(view);
  });
  
  // Listen for thanks created (update trust scores)
  eventBus.on('thanks.created', async (data) => {
    // Update the recipient's trust score
    const newScore = await TrustCalculator.calculateScore(data.to_member_id);
    
    // Emit trust updated event
    eventBus.emit('trust.updated', {
      memberId: data.to_member_id,
      newScore
    });
  });
}