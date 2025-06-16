import type { ActivityItem, ActivityFeedFilter } from '@belongnetwork/types';
import { aggregateActivityFeed } from './activityFeedAggregator';
import { logger } from '@belongnetwork/core';

/**
 * Fetch activity feed for a community
 */
export async function fetchActivityFeed(
  filter: ActivityFeedFilter
): Promise<ActivityItem[]> {
  try {
    logger.info('Fetching activity feed', { filter });

    const activities = await aggregateActivityFeed(filter);

    logger.info('Successfully fetched activity feed', { 
      count: activities.length,
      filter 
    });

    return activities;
  } catch (error) {
    logger.error('Failed to fetch activity feed', { error, filter });
    throw error;
  }
}