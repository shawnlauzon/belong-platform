import { UserFilter } from './types';

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filter: UserFilter) => [...userKeys.lists(), filter] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
  publicDetails: () => [...userKeys.all, 'public'] as const,
  publicDetail: (memberConnectionCode: string) => [...userKeys.publicDetails(), memberConnectionCode] as const,
};
