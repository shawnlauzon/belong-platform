// import { LocationManager } from '../../community-services/src/services/LocationManager';
// import { AuthManager } from '../../community-services/src/services/AuthManager';
// import { CommunityManager } from '../../community-services/src/services/CommunityManager';
// import { ProfileManager } from '../../community-services/src/services/ProfileManager';
// import { ResourceManager } from '../../resource-services/src/services/ResourceManager';
// import { ThanksManager } from '../../trust-services/src/services/ThanksManager';
// import { eventBus } from '@belongnetwork/core';
// import { useAppStore } from '@belongnetwork/core';
// import { TrustCalculator } from '@belongnetwork/trust-services/src/services/TrustCalculator';
// import { logger, logEvent } from '@belongnetwork/core';

// // Export managers for use in the app
// export const locationManager = LocationManager;
// export const trustCalculator = TrustCalculator;

// // Initialize event listeners
// export function initializeListeners() {
//   logger.info('🎯 Initializing application event listeners...');

//   // Initialize all managers
//   AuthManager.initialize();
//   CommunityManager.initialize();
//   ProfileManager.initialize();
//   ResourceManager.initialize();
//   ThanksManager.initialize();

//   // Listen for location updates
//   eventBus.on('location.updated', (event) => {
//     logger.debug('📍 Location updated:', event.data);
//     useAppStore.getState().setUserLocation(event.data);
//   });

//   // Listen for community changes
//   eventBus.on('community.changed', (event) => {
//     const { communityId } = event.data;
//     logger.debug('🏘️ Community change requested:', { communityId });

//     // Note: The actual community object will be set by the CommunitySelector component
//     // since it has access to the communities data from the hook
//   });

//   // Listen for view mode changes
//   eventBus.on('view.changed', (event) => {
//     const { view } = event.data;
//     logger.debug('👁️ View mode changed:', { view });
//     useAppStore.getState().setViewMode(view);
//   });

//   logger.info('✅ Application event listeners initialized');
// }
