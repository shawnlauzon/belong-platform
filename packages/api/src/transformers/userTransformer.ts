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
    firstName: (metadata?.first_name as string) || '',
    lastName: metadata?.last_name as string | undefined,
    email,
    fullName: metadata?.full_name as string | undefined,
    avatarUrl: metadata?.avatar_url as string | undefined,
    createdAt: new Date(rest.created_at),
    updatedAt: new Date(rest.updated_at),
  };
}

/**
 * Transform a domain user object to a database user record
 */
export function toDbUser(user: Partial<User>): Partial<UserRow> {
  const { firstName, lastName, fullName, avatarUrl, ...rest } = user;
  return {
    ...rest,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      avatar_url: avatarUrl,
    },
    created_at: user.createdAt?.toISOString(),
    updated_at: user.updatedAt?.toISOString(),
  };
}

// Export error messages for use in tests
export { ERROR_MESSAGES };