export * from './hooks';
export * from './events';
export * from './services';

// Initialize the thanks management system
import { initializeThanksEvents } from './events/trustEvents';

// Initialize all thanks services when this module is imported
initializeThanksEvents();

// Re-export the initialization function for manual initialization if needed
export { initializeThanksEvents } from './events/trustEvents';