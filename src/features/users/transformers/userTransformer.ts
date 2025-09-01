import type { UserSummary, User, CurrentUser } from '../types/user';
import type { ProfileRow, ProfileInsertRow, ProfileUpdateRow } from '../types/profileRow';
import type { PublicProfileRow, PublicProfileSummaryRow } from '../types/publicProfileRow';
import type { UserMetadata } from '../types/user';

/**
 * Transforms a public profile row to UserSummary (minimal user info)
 */
export function toUserSummary(profile: PublicProfileSummaryRow): UserSummary {
  if (!profile.id) {
    throw new Error('Profile ID is required');
  }
  
  return {
    id: profile.id,
    firstName: profile.first_name || undefined,
    lastName: profile.last_name || undefined,
    fullName: profile.full_name || undefined,
    avatarUrl: profile.avatar_url || undefined,
  };
}

/**
 * Transforms a public profile row to User (full public profile)
 */
export function toUser(profile: PublicProfileRow): User {
  if (!profile.id || !profile.created_at || !profile.updated_at) {
    throw new Error('Profile ID, created_at, and updated_at are required');
  }
  
  return {
    id: profile.id,
    firstName: profile.first_name || undefined,
    lastName: profile.last_name || undefined,
    fullName: profile.full_name || undefined,
    avatarUrl: profile.avatar_url || undefined,
    bio: profile.bio || undefined,
    createdAt: new Date(profile.created_at),
    updatedAt: new Date(profile.updated_at),
  };
}

/**
 * Transforms a full profile row to CurrentUser (includes private fields)
 */
export function toCurrentUser(profile: ProfileRow): CurrentUser {
  const metadata = (profile.user_metadata || {}) as UserMetadata;
  const { first_name, last_name, full_name, avatar_url, bio, location } = metadata;

  return {
    id: profile.id,
    firstName: first_name || undefined,
    lastName: last_name || undefined,
    fullName: full_name || undefined,
    avatarUrl: avatar_url || undefined,
    bio: bio || undefined,
    email: profile.email || '',
    location: location || undefined,
    createdAt: new Date(profile.created_at),
    updatedAt: new Date(profile.updated_at),
  };
}

/**
 * Prepares current user data for database insertion into profiles table
 */
export function toCurrentUserInsertRow(
  userData: Omit<CurrentUser, 'id' | 'createdAt' | 'updatedAt'> & { id: string },
): ProfileInsertRow {
  const { id, email, firstName, lastName, fullName, avatarUrl, bio, location } = userData;

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
 * Prepares current user data for updating the profiles table
 */
export function toCurrentUserUpdateRow(
  userData: Partial<Omit<CurrentUser, 'id' | 'createdAt' | 'updatedAt'>> & { id: string },
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

  const updateRow: ProfileUpdateRow = {
    user_metadata: updatedMetadata,
    updated_at: new Date().toISOString(),
  };

  // Update email if provided (only for current user)
  if (userData.email !== undefined) {
    updateRow.email = userData.email;
  }

  return updateRow;
}

// Re-export row types for convenience
export type {
  ProfileRow,
  ProfileInsertRow,
  ProfileUpdateRow,
} from '../types/profileRow';