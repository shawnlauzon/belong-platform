export * from './hooks';
export * from './events';
export * from './services';

// Initialize the resource management system
import { ResourceManager } from './services/ResourceManager';

// Initialize all resource services when this module is imported
ResourceManager.initialize();