export * from './hooks';
export * from './events';
export * from './services';

// Initialize the resource management system
import { initializeResourceEvents } from './events/resourceEvents';

// Initialize all resource services when this module is imported
initializeResourceEvents();

// Re-export the initialization function for manual initialization if needed
export { initializeResourceEvents } from './events/resourceEvents';