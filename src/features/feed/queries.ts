// Feed
export const feedKeys = {
  all: ['feed'] as const,
  feed: () => [...feedKeys.all, 'feed'] as const,
  infiniteFeed: () => [...feedKeys.all, 'infiniteFeed'] as const,
};
