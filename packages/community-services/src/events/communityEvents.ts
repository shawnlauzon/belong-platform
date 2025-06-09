import { eventBus, logger } from '@belongnetwork/core';
import { CommunityFetcher } from '../services/CommunityFetcher';

/**
 * Initialize all community event handlers
 * This function sets up event listeners for all community-related operations
 */
export function initializeCommunityEvents(): void {
  logger.info('🏘️ CommunityEvents: Initializing community event handlers...');

  try {
    // Initialize community service modules
    CommunityFetcher.initialize();

    logger.info('✅ CommunityEvents: All community event handlers initialized successfully');
  } catch (error) {
    logger.error('❌ CommunityEvents: Failed to initialize community event handlers', { error });
    throw error;
  }
}

/**
 * Helper function to emit community fetch request
 */
export function fetchCommunities(filters?: {
  level?: 'neighborhood' | 'city' | 'state' | 'country' | 'global';
  parent_id?: string;
  searchTerm?: string;
  country?: string;
  state?: string;
  city?: string;
}): void {
  eventBus.emit('community.fetch.requested', { filters });
}