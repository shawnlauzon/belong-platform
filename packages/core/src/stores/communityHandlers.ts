import { eventBus } from '../eventBus/eventBus';
import { AppEvent, Community } from '../types';
import { logger } from '../utils';
import {
  isCommunityFetchSuccessEvent,
  isCommunityFetchFailedEvent,
  isCommunityActiveChangeRequestedEvent,
} from '../types/events';

// Initialize community event listeners
export function initializeCommunityListeners(
  setCommunitiesLoading: (isLoading: boolean) => void,
  setCommunitiesError: (error: string | null) => void,
  setCommunities: (communities: Community[]) => void,
  setActiveCommunity: (communityId: string) => void,
  getStore: () => any
) {
  logger.info('🏘️ Store: Initializing community event listeners');

  // Handle community fetch requests (set loading state)
  eventBus.on('community.fetch.requested', (event: AppEvent) => {
    if (event.type !== 'community.fetch.requested') {
      logger.error(
        '🏘️ Store: Received invalid community.fetch.requested event',
        { event }
      );
      return;
    }

    logger.debug('🏘️ Store: Community fetch requested, setting loading state');
    setCommunitiesLoading(true);
    setCommunitiesError(null);
  });

  // Handle successful community operations
  eventBus.on('community.fetch.success', (event: AppEvent) => {
    if (!isCommunityFetchSuccessEvent(event)) {
      logger.error('🏘️ Store: Received invalid community.fetch.success event', {
        event,
      });
      return;
    }

    logger.debug('🏘️ Store: Handling successful community fetch', {
      count: event.data.communities.length,
    });
    setCommunities(event.data.communities);
    setCommunitiesLoading(false);
    setCommunitiesError(null);

    // Check if active community is not set and set it to global community
    const currentState = getStore();
    if (!currentState.app.activeCommunityId) {
      const globalCommunity = event.data.communities.find(
        (community: Community) => community.level === 'global'
      );
      
      if (globalCommunity) {
        logger.debug('🏘️ Store: Setting active community to global community', {
          communityId: globalCommunity.id,
          communityName: globalCommunity.name,
        });
        setActiveCommunity(globalCommunity.id);
      } else {
        logger.warn('🏘️ Store: No global community found in fetched communities');
      }
    }
  });

  // Handle failed community operations
  eventBus.on('community.fetch.failed', (event: AppEvent) => {
    if (!isCommunityFetchFailedEvent(event)) {
      logger.error('🏘️ Store: Received invalid community.fetch.failed event', {
        event,
      });
      return;
    }

    logger.debug('🏘️ Store: Handling failed community fetch', {
      error: event.data.error,
    });
    setCommunitiesLoading(false);
    setCommunitiesError(event.data.error);
  });

  // Handle active community change requests
  eventBus.on('community.active.change.requested', (event: AppEvent) => {
    if (!isCommunityActiveChangeRequestedEvent(event)) {
      logger.error(
        '🏘️ Store: Received invalid community.active.change.requested event',
        { event }
      );
      return;
    }

    logger.debug('🏘️ Store: Handling active community change request', {
      communityId: event.data.communityId,
    });
    setActiveCommunity(event.data.communityId);

    // Emit success event
    eventBus.emit('community.active.changed', {
      communityId: event.data.communityId,
    });
  });

  logger.info('✅ Store: Community event listeners initialized');
}