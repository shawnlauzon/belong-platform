import { Shoutout } from '../../shoutouts';
import { Resource } from '../../resources';

export interface FeedItem {
  id: string;
  type: 'resource' | 'shoutout';
  data: Resource | Shoutout;
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

export interface ShoutoutFeedItem extends Omit<FeedItem, 'data' | 'type'> {
  type: 'shoutout';
  data: Shoutout;
}

// Type guard functions
export function isResourceItem(item: FeedItem): item is ResourceFeedItem {
  return item.type === 'resource';
}

export function isShoutoutItem(item: FeedItem): item is ShoutoutFeedItem {
  return item.type === 'shoutout';
}

// Utility functions for filtering feed items by type
export function getResourceItems(items: FeedItem[]): ResourceFeedItem[] {
  return items.filter(isResourceItem);
}

export function getShoutoutItems(items: FeedItem[]): ShoutoutFeedItem[] {
  return items.filter(isShoutoutItem);
}

