import type { Database } from '@belongnetwork/types';
import type { Community, Resource, User } from '@belongnetwork/types';

export type CommunityRow = Database['public']['Tables']['communities']['Row'];
export type UserRow = Database['public']['Tables']['profiles']['Row'];
export type ResourceRow = Database['public']['Tables']['resources']['Row'];

// User transformer functions (now pure functions)
export type ToDomainUser = (dbUser: UserRow) => User;
export type ToDbUser = (user: Partial<User>) => Partial<UserRow>;

export interface CommunityTransformers {
  toDomainCommunity: (dbCommunity: CommunityRow) => Community;
  toDbCommunity: (community: Community) => CommunityRow;
}

export interface ResourceTransformers {
  toDomainResource: (dbResource: ResourceRow) => Resource;
  toDbResource: (
    resource: Partial<Resource>
  ) => Partial<Database['public']['Tables']['resources']['Insert']>;
}

export interface Transformers
  extends CommunityTransformers,
    ResourceTransformers {
  // User transformers are now standalone functions
  toDomainUser: ToDomainUser;
  toDbUser: ToDbUser;
}