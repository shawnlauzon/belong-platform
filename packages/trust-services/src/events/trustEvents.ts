import { eventBus, logger } from '@belongnetwork/core';
import { ThanksFetcher } from '../services/ThanksFetcher';
import { ThanksCreator } from '../services/ThanksCreator';
import { ThanksUpdater } from '../services/ThanksUpdater';
import { ThanksDeleter } from '../services/ThanksDeleter';

/**
 * Initialize all thanks event handlers
 * This function sets up event listeners for all thanks-related operations
 */
export function initializeThanksEvents(): void {
  logger.info('🙏 ThanksEvents: Initializing thanks event handlers...');

  try {
    // Initialize all CRUD service modules
    ThanksFetcher.initialize();
    ThanksCreator.initialize();
    ThanksUpdater.initialize();
    ThanksDeleter.initialize();

    logger.info('✅ ThanksEvents: All thanks event handlers initialized successfully');
  } catch (error) {
    logger.error('❌ ThanksEvents: Failed to initialize thanks event handlers', { error });
    throw error;
  }
}

/**
 * Helper function to emit thanks fetch request
 */
export function fetchThanks(filters?: any): void {
  eventBus.emit('thanks.fetch.requested', { filters });
}

/**
 * Helper function to emit thanks create request
 */
export function createThanks(thanksData: any): void {
  eventBus.emit('thanks.create.requested', thanksData);
}

/**
 * Helper function to emit thanks update request
 */
export function updateThanks(thanksData: any): void {
  eventBus.emit('thanks.update.requested', thanksData);
}

/**
 * Helper function to emit thanks delete request
 */
export function deleteThanks(thanksId: string): void {
  eventBus.emit('thanks.delete.requested', { thanksId });
}