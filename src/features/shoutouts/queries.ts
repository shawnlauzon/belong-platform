export const shoutoutKeys = {
  all: ['shoutouts'] as const,
  listByReceiver: (id: string) =>
    [...shoutoutKeys.all, 'receiver', id] as const,
  details: () => [...shoutoutKeys.all, 'detail'] as const,
  detail: (id: string) => [...shoutoutKeys.details(), id] as const,
};
