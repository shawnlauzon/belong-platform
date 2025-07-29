export const shoutoutKeys = {
  all: ['shoutouts'] as const,
  lists: () => [...shoutoutKeys.all, 'list'] as const,
  listsByResource: () => [...shoutoutKeys.lists(), 'by-resource'] as const,
  listByResource: (id: string) =>
    [...shoutoutKeys.listsByResource(), id] as const,
  listsByCommunity: () => [...shoutoutKeys.lists(), 'by-community'] as const,

  // TODO: Remove string[] and replace with each community
  listByCommunity: (id: string | string[]) =>
    [...shoutoutKeys.listsByCommunity(), id] as const,

  listsBySender: () => [...shoutoutKeys.lists(), 'by-sender'] as const,
  listBySender: (id: string) => [...shoutoutKeys.listsBySender(), id] as const,

  details: () => [...shoutoutKeys.all, 'detail'] as const,
  detail: (id: string) => [...shoutoutKeys.details(), id] as const,
};
