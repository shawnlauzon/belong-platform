export const shoutoutKeys = {
  all: ['shoutouts'] as const,
  listByReceiver: (id: string) =>
    [...shoutoutKeys.all, 'receiver', id] as const,
  detail: (id: string) => ['shoutouts', 'detail', id] as const,
};
