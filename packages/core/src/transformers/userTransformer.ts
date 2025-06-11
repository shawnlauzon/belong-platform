import type { Database } from '../types/database';
import type { User } from '../types/entities';

export type UserRow = Database['public']['Tables']['profiles']['Row'];

/**
 * Transforms a database user row to a domain User
 */
export const toDomainUser = (dbUser: UserRow): User => {
  if (!dbUser) {
    throw new Error('Database user is required');
  }

  const { email, user_metadata, ...rest } = dbUser;
  const metadata = (typeof user_metadata === 'object' && user_metadata !== null) ? user_metadata : {};

  return {
    ...rest,
    email: email || '',
    first_name: (metadata as any).first_name || '',
    last_name: (metadata as any).last_name || '',
    avatar_url: (metadata as any).avatar_url || null,
    ...(metadata as Record<string, unknown>),
  } as User;
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