import { ResourceInfo } from '../../resources';
import { EventInfo } from '../../events';

export interface FeedItem {
  type: 'resource' | 'event';
  data: ResourceInfo | EventInfo;
}

export interface FeedInfo {
  items: FeedItem[];
  hasMore: boolean;
  nextCursor?: string;
}