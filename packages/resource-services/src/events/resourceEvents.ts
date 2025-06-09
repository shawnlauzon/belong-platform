import { eventBus, logger } from '@belongnetwork/core';
import { ResourceFetcher } from '../services/ResourceFetcher';
import { ResourceCreator } from '../services/ResourceCreator';
import { ResourceUpdater } from '../services/ResourceUpdater';
import { ResourceDeleter } from '../services/ResourceDeleter';

/**
 * Initialize all resource event handlers
 * This function sets up event listeners for all resource-related operations
 */
export function initializeResourceEvents(): void {
  logger.info('📦 ResourceEvents: Initializing resource event handlers...');

  try {
    // Initialize all CRUD service modules
    ResourceFetcher.initialize();
    ResourceCreator.initialize();
    ResourceUpdater.initialize();
    ResourceDeleter.initialize();

    logger.info('✅ ResourceEvents: All resource event handlers initialized successfully');
  } catch (error) {
    logger.error('❌ ResourceEvents: Failed to initialize resource event handlers', { error });
    throw error;
  }
}

/**
 * Helper function to emit resource fetch request
 */
export function fetchResources(filters?: any): void {
  eventBus.emit('resource.fetch.requested', { filters });
}

/**
 * Helper function to emit resource create request
 */
export function createResource(resourceData: any): void {
  eventBus.emit('resource.create.requested', resourceData);
}

/**
 * Helper function to emit resource update request
 */
export function updateResource(resourceData: any): void {
  eventBus.emit('resource.update.requested', resourceData);
}

/**
 * Helper function to emit resource delete request
 */
export function deleteResource(resourceId: string): void {
  eventBus.emit('resource.delete.requested', { resourceId });
}