import { Coordinates, IsPersisted } from '@/shared';

export type User = IsPersisted<UserData & UserSummaryFields>;
export type UserSummary = UserSummaryFields & { id: string };

export type UserData = UserSummaryFields & {
  email: string;
  bio?: string;
  location?: Coordinates;
};

type UserSummaryFields = {
  firstName: string;
  lastName?: string;
  fullName?: string;
  avatarUrl?: string;

  // TODO: Trust score
  // trustScore: number;
};
