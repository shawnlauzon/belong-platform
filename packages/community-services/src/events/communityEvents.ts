import { eventBus, logger } from '@belongnetwork/core';
import { CommunityFetcher } from '../services/CommunityFetcher';
import { CommunityCreator } from '../services/CommunityCreator';
import { CommunityUpdater } from '../services/CommunityUpdater';
import { CommunityDeleter } from '../services/CommunityDeleter';

/**
 * Initialize all community event handlers
 * This function sets up event listeners for all community-related operations
 */
export function initializeCommunityEvents(): void {
  logger.info('🏘️ CommunityEvents: Initializing community event handlers...');

  try {
    // Initialize all CRUD service modules
    CommunityFetcher.initialize();
    CommunityCreator.initialize();
    CommunityUpdater.initialize();
    CommunityDeleter.initialize();

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

/**
 * Helper function to emit community create request
 */
export function createCommunity(communityData: {
  name: string;
  level: 'neighborhood' | 'city' | 'state' | 'country' | 'global';
  description: string;
  country: string;
  state?: string;
  city: string;
  center?: { lat: number; lng: number };
  radius_km?: number;
}): void {
  eventBus.emit('community.create.requested', communityData);
}

/**
 * Helper function to emit community update request
 */
export function updateCommunity(communityData: any): void {
  eventBus.emit('community.update.requested', communityData);
}

/**
 * Helper function to emit community delete request
 */
export function deleteCommunity(communityId: string): void {
  eventBus.emit('community.delete.requested', { communityId });
}