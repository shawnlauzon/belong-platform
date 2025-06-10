export * from './hooks';
export * from './events';
export * from './services';

// Initialize the thanks management system
import { initializeTrustEvents } from './events/trustEvents';

// Initialize all thanks services when this module is imported
initializeTrustEvents();

// Re-export the initialization function for manual initialization if needed
export { initializeTrustEvents } from './events/trustEvents';
