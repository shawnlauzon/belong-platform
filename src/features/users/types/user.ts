import { Coordinates, IsPersisted } from '@/shared';

export type User = IsPersisted<UserData & UserSummaryFields>;
export type UserSummary = IsPersisted<UserSummaryFields>;

export type UserData = UserSummaryFields & {
  lastName?: string;
  fullName?: string;
  email: string;
  bio?: string;
  location?: Coordinates;
};

type UserSummaryFields = {
  firstName: string;
  avatarUrl?: string;

  // TODO: Trust score
  // trustScore: number;
};
