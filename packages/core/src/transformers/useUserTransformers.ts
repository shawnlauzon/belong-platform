import type { UserRow } from './transformers.types';
import type { User } from '../types/entities';

export function useUserTransformers() {
  const toDomainUser = (dbUser: UserRow): User => {
    if (!dbUser) {
      throw new Error('Database user is required');
    }

    const { user_metadata, ...rest } = dbUser;
    const metadata = user_metadata as Record<string, unknown>;

    return {
      ...rest,
      first_name: (metadata?.first_name as string) || '',
      last_name: metadata?.last_name as string | undefined,
      avatar_url: metadata?.avatar_url as string | undefined,
      created_at: new Date(rest.created_at),
      updated_at: new Date(rest.updated_at),
    };
  };

  const toDbUser = (user: Partial<User>): Partial<UserRow> => {
    const { first_name, last_name, avatar_url, ...rest } = user;
    return {
      ...rest,
      user_metadata: {
        first_name,
        last_name,
        avatar_url,
      },
      created_at: user.created_at?.toISOString(),
      updated_at: user.updated_at?.toISOString(),
    };
  };

  return { toDomainUser, toDbUser };
}
