export interface FeedItem {
  id: string;
  type: 'resource' | 'event' | 'shoutout';
}

export interface Feed {
  items: FeedItem[];
  hasMore: boolean;
  nextCursor?: string;
}


