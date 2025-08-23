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

// Type for the user_metadata JSONB column
export type UserMetadata = {
  first_name?: string;
  last_name?: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  location?: {
    lat: number;
    lng: number;
  };
};


export type UserSummary = Pick<User, 'id' | 'firstName' | 'lastName' | 'fullName' | 'avatarUrl'>;
