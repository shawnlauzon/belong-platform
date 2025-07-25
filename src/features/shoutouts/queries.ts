export const shoutoutKeys = {
  all: ['shoutouts'] as const,
  lists: () => [...shoutoutKeys.all, 'list'] as const,
  listByResource: (id: string) =>
    [...shoutoutKeys.lists(), 'by-resource', id] as const,
  listByCommunity: (id: string | string[]) =>
    [...shoutoutKeys.lists(), 'by-community', id] as const,
  details: () => [...shoutoutKeys.all, 'detail'] as const,
  detail: (id: string) => [...shoutoutKeys.details(), id] as const,
};
