import { Coordinates, IsPersisted } from '@/shared';

export type User = IsPersisted<UserData>;

export type UserData = {
  firstName: string;
  lastName?: string;
  fullName?: string;
  avatarUrl?: string;
  email: string;
  bio?: string;
  location?: Coordinates;
};

export type UserSummary = Pick<User, 'id' | 'firstName' | 'lastName' | 'fullName' | 'avatarUrl'>;
