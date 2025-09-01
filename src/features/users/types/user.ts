import { Coordinates, IsPersisted } from '@/shared';

/**
 * Minimal user info - just enough to identify someone
 * Used in: comment authors, resource owners, message previews
 */
export type UserSummary = {
  id: string;
  firstName: string;
  avatarUrl?: string;
};

/**
 * Full public profile - what anyone can see about another user
 * Used in: user profile pages, user directories, detailed views
 */
export type PublicUser = UserSummary & {
  lastName?: string;
  fullName?: string;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Current user data - includes private fields only the user themselves can see
 * Used in: current user's profile, settings, edit forms
 */
export type CurrentUser = PublicUser & {
  email: string;
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

// Make types persistent with ID
export type PublicUserWithId = IsPersisted<PublicUser>;
export type CurrentUserWithId = IsPersisted<CurrentUser>;