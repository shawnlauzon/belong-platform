export * from './hooks';
export * from './events';
export * from './services';

// Initialize the community management system
import { initializeCommunityEvents } from './events/communityEvents';

// Initialize all community services when this module is imported
initializeCommunityEvents();

// Re-export the initialization function for manual initialization if needed
export { initializeCommunityEvents } from './events/communityEvents';