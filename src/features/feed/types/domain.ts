import { ResourceInfo } from '../../resources';
import { EventInfo } from '../../events';
import { ShoutoutInfo } from '../../shoutouts';

export interface FeedItem {
  type: 'resource' | 'event' | 'shoutout';
  data: ResourceInfo | EventInfo | ShoutoutInfo;
}

export interface FeedInfo {
  items: FeedItem[];
  hasMore: boolean;
  nextCursor?: string;
}