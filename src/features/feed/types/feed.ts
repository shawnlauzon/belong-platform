export interface FeedItem {
  id: string;
  type: 'resource' | 'shoutout';
}

export interface Feed {
  items: FeedItem[];
  hasMore: boolean;
  nextCursor?: string;
}


