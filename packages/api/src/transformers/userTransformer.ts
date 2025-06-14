import type { Database } from '@belongnetwork/types';
import type { User } from '@belongnetwork/types';

export type UserRow = Database['public']['Tables']['profiles']['Row'];

// Error message constants
const ERROR_MESSAGES = {
  /** Error thrown when database user parameter is null or undefined */
  DATABASE_USER_REQUIRED: 'Database user is required',
} as const;

/**
 * Transform a database user record to a domain user object
 */
export function toDomainUser(dbUser: UserRow): User {
  if (!dbUser) {
    throw new Error(ERROR_MESSAGES.DATABASE_USER_REQUIRED);
  }

  const { user_metadata, email, ...rest } = dbUser;
  const metadata = user_metadata as Record<string, unknown>;

  return {
    ...rest,
    first_name: (metadata?.first_name as string) || '',
    last_name: metadata?.last_name as string | undefined,
    email,
    full_name: metadata?.full_name as string | undefined,
    avatar_url: metadata?.avatar_url as string | undefined,
    created_at: new Date(rest.created_at),
    updated_at: new Date(rest.updated_at),
  };
}

/**
 * Transform a domain user object to a database user record
 */
export function toDbUser(user: Partial<User>): Partial<UserRow> {
  const { first_name, last_name, full_name, avatar_url, ...rest } = user;
  return {
    ...rest,
    user_metadata: {
      first_name,
      last_name,
      full_name,
      avatar_url,
    },
    created_at: user.created_at?.toISOString(),
    updated_at: user.updated_at?.toISOString(),
  };
}

// Export error messages for use in tests
export { ERROR_MESSAGES };