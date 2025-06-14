import type { Database } from '@belongnetwork/types';
import type { Community, Resource, User } from '@belongnetwork/types';

export type CommunityRow = Database['public']['Tables']['communities']['Row'];
export type UserRow = Database['public']['Tables']['profiles']['Row'];
export type ResourceRow = Database['public']['Tables']['resources']['Row'];

// User transformer functions (now pure functions)
export type ToDomainUser = (dbUser: UserRow) => User;
export type ToDbUser = (user: Partial<User>) => Partial<UserRow>;

// Resource transformer functions (now pure functions)
export type ToDomainResource = (dbResource: ResourceRow & { owner?: any }) => Resource;
export type ToDbResource = (resource: Partial<Resource>) => Partial<ResourceRow>;

export interface CommunityTransformers {
  toDomainCommunity: (dbCommunity: CommunityRow) => Community;
  toDbCommunity: (community: Community) => CommunityRow;
}

export interface Transformers extends CommunityTransformers {
  // User and Resource transformers are now standalone functions
  toDomainUser: ToDomainUser;
  toDbUser: ToDbUser;
  toDomainResource: ToDomainResource;
  toDbResource: ToDbResource;
}