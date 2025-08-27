export const authKeys = {
  all: ['auth'] as const,
  currentUser: () => [...authKeys.all, 'currentUser'] as const,
  currentUserId: () => [...authKeys.all, 'currentUserId'] as const,
};
