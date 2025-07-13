import { Shoutout } from '../../shoutouts';
import { Resource } from '../../resources';
import { Gathering } from '../../gatherings';

export interface FeedItem {
  id: string;
  type: 'resource' | 'gathering' | 'shoutout';
  data: Resource | Gathering | Shoutout;
}

export interface Feed {
  items: FeedItem[];
  hasMore: boolean;
  nextCursor?: string;
}

// Type-specific feed item interfaces
export interface ResourceFeedItem extends Omit<FeedItem, 'data' | 'type'> {
  type: 'resource';
  data: Resource;
}

export interface GatheringFeedItem extends Omit<FeedItem, 'data' | 'type'> {
  type: 'gathering';
  data: Gathering;
}

export interface ShoutoutFeedItem extends Omit<FeedItem, 'data' | 'type'> {
  type: 'shoutout';
  data: Shoutout;
}

// Type guard functions
export function isResourceItem(item: FeedItem): item is ResourceFeedItem {
  return item.type === 'resource';
}

export function isGatheringItem(item: FeedItem): item is GatheringFeedItem {
  return item.type === 'gathering';
}

export function isShoutoutItem(item: FeedItem): item is ShoutoutFeedItem {
  return item.type === 'shoutout';
}

// Utility functions for filtering feed items by type
export function getResourceItems(items: FeedItem[]): ResourceFeedItem[] {
  return items.filter(isResourceItem);
}

export function getGatheringItems(items: FeedItem[]): GatheringFeedItem[] {
  return items.filter(isGatheringItem);
}

export function getShoutoutItems(items: FeedItem[]): ShoutoutFeedItem[] {
  return items.filter(isShoutoutItem);
}

