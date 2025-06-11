import type { Database } from '../types/database';
import type { User } from '../types/entities';
import type { Json } from '../types/database';

export type UserRow = Database['public']['Tables']['profiles']['Row'];

interface UserMetadata {
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  [key: string]: Json | undefined; // Keep the index signature for other potential properties
}

/**
 * Transforms a database user row to a domain User
 */
export const toDomainUser = (dbUser: UserRow): User => {
  if (!dbUser) {
    throw new Error('Database user is required');
  }

  const { user_metadata, ...rest } = dbUser;

  const metadata = user_metadata as UserMetadata;

  // extract the fields in metadata and create an object
  const user: User = {
    ...rest,
    first_name: metadata?.['first_name'] || '',
    last_name: metadata?.['last_name'],
    avatar_url: metadata?.['avatar_url'],
    created_at: new Date(rest.created_at),
    updated_at: new Date(rest.updated_at),
  };

  return user;
};

/**
 * Transforms a domain User to a database insert/update object
 */
export const toDbUser = (
  user: Partial<User>
): Partial<Database['public']['Tables']['profiles']['Insert']> => {
  const { first_name, last_name, avatar_url, ...rest } = user;
  const result: Record<string, unknown> = { ...rest };

  // Store user profile fields in user_metadata
  const metadata: Record<string, unknown> = {};
  if (first_name !== undefined) metadata.first_name = first_name;
  if (last_name !== undefined) metadata.last_name = last_name;
  if (avatar_url !== undefined) metadata.avatar_url = avatar_url;

  if (Object.keys(metadata).length > 0) {
    result.user_metadata = metadata;
  }

  return result as Partial<Database['public']['Tables']['profiles']['Insert']>;
};
