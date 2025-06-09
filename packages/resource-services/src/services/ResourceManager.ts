import { logger } from '@belongnetwork/core';
import { ResourceFetcher } from './ResourceFetcher';
import { ResourceCreator } from './ResourceCreator';
import { ResourceUpdater } from './ResourceUpdater';
import { ResourceDeleter } from './ResourceDeleter';

export class ResourceManager {
  private static initialized = false;

  /**
   * Initialize all resource CRUD services
   * This sets up event listeners for all resource operations
   */
  static initialize(): void {
    if (this.initialized) {
      logger.debug('📦 ResourceManager: Already initialized, skipping...');
      return;
    }

    logger.info(
      '🚀 ResourceManager: Initializing resource management system...'
    );

    try {
      // Initialize all CRUD service modules
      ResourceFetcher.initialize();
      ResourceCreator.initialize();
      ResourceUpdater.initialize();
      ResourceDeleter.initialize();

      this.initialized = true;
      logger.info(
        '✅ ResourceManager: All resource services initialized successfully'
      );
    } catch (error) {
      logger.error(
        '❌ ResourceManager: Failed to initialize resource services',
        { error }
      );
      throw error;
    }
  }

  /**
   * Check if the resource manager has been initialized
   */
  static isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get the status of all resource services
   */
  static getStatus(): {
    initialized: boolean;
    services: string[];
  } {
    return {
      initialized: this.initialized,
      services: [
        'ResourceFetcher',
        'ResourceCreator',
        'ResourceUpdater',
        'ResourceDeleter',
      ],
    };
  }
}
