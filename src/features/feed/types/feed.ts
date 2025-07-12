import { Shoutout } from '../../shoutouts';
import { Resource } from '../../resources';
import { Gathering } from '../../gatherings';

export interface FeedItem {
  type: 'resource' | 'gathering' | 'shoutout';
  data: Resource | Gathering | Shoutout;
}

export interface Feed {
  items: FeedItem[];
  hasMore: boolean;
  nextCursor?: string;
}

