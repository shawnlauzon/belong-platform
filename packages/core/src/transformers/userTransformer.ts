import type { Database } from '../types/database';
import type { User } from '../types/entities';

type UserRow = Database['public']['Tables']['profiles']['Row'] & {
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
};

/**
 * Transforms a database user row to a domain User
 */
export const toDomainUser = (dbUser: UserRow): User => {
  if (!dbUser) {
    throw new Error('Database user is required');
  }

  const { email, user_metadata, first_name, last_name, avatar_url, ...rest } = dbUser;
  const metadata = typeof user_metadata === 'object' ? user_metadata : {};

  return {
    ...rest,
    email: email || '',
    first_name: first_name || '',
    last_name: last_name || '',
    avatar_url: avatar_url || null,
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
  
  // Only include fields that exist in the profiles table
  if (first_name !== undefined) result.first_name = first_name || '';
  if (last_name !== undefined) result.last_name = last_name || '';
  if (avatar_url !== undefined) result.avatar_url = avatar_url || null;
  
  return result as Partial<Database['public']['Tables']['profiles']['Insert']>;
};
