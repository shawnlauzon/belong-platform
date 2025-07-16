import type { User, UserData, UserSummary } from '..';
import type {
  ProfileRow,
  ProfileInsertRow,
  ProfileUpdateRow,
} from '../types/profileRow';

// Type for the user_metadata JSONB column
type UserMetadata = {
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

/**
 * Transforms a database profile record to a domain user object
 */
export function toDomainUser(profile: ProfileRow): User {
  const metadata = (profile.user_metadata || {}) as UserMetadata;
  const { first_name, last_name, full_name, avatar_url, bio, location } =
    metadata;

  return {
    id: profile.id,
    email: profile.email || '',
    firstName: first_name || '',
    lastName: last_name,
    fullName: full_name,
    avatarUrl: avatar_url,
    bio,
    location,
    createdAt: new Date(profile.created_at),
    updatedAt: new Date(profile.updated_at),
  };
}

/**
 * Prepares user data for database insertion into profiles table
 */
export function toUserInsertRow(
  userData: UserData & { id: string },
): ProfileInsertRow {
  const { id, email, firstName, lastName, fullName, avatarUrl, bio, location } =
    userData;

  const user_metadata: UserMetadata = {
    first_name: firstName,
    last_name: lastName,
    full_name: fullName,
    avatar_url: avatarUrl,
    bio,
    location,
  };

  return {
    id,
    email,
    user_metadata,
  };
}

/**
 * Prepares user data for updating the profiles table
 */
export function toUserUpdateRow(
  userData: Partial<UserData> & { id: string },
  currentProfile: ProfileRow,
): ProfileUpdateRow {
  const currentMetadata = (currentProfile.user_metadata || {}) as UserMetadata;

  // Only include fields that are explicitly provided in userData
  const updatedMetadata: UserMetadata = { ...currentMetadata };

  // Update only the fields that are explicitly provided (not undefined)
  if (userData.firstName !== undefined) {
    updatedMetadata.first_name = userData.firstName;
  }
  if (userData.lastName !== undefined) {
    updatedMetadata.last_name = userData.lastName;
  }
  if (userData.fullName !== undefined) {
    updatedMetadata.full_name = userData.fullName;
  }
  if (userData.avatarUrl !== undefined) {
    updatedMetadata.avatar_url = userData.avatarUrl;
  }
  if (userData.bio !== undefined) {
    updatedMetadata.bio = userData.bio;
  }
  if (userData.location !== undefined) {
    updatedMetadata.location = userData.location;
  }

  return {
    user_metadata: updatedMetadata,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Transform a database profile record to a UserSummary object
 */
export function toUserSummary(profile: ProfileRow): UserSummary {
  const metadata = (profile.user_metadata || {}) as UserMetadata;
  return {
    id: profile.id,
    firstName: metadata.first_name || '',
    avatarUrl: metadata.avatar_url,
  };
}

// Export types for testing
export type {
  ProfileRow as UserRow,
  ProfileInsertRow as UserInsertRow,
  ProfileUpdateRow as UserUpdateRow,
};
