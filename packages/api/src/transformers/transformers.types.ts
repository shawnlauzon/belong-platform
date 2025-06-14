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

// Community transformer functions (now pure functions)
export type ToDomainCommunity = (dbCommunity: CommunityRow, creator?: User, parent?: Community) => Community;
export type ToDbCommunity = (community: Community) => Partial<CommunityRow>;

export interface Transformers {
  // All transformers are now standalone functions
  toDomainUser: ToDomainUser;
  toDbUser: ToDbUser;
  toDomainResource: ToDomainResource;
  toDbResource: ToDbResource;
  toDomainCommunity: ToDomainCommunity;
  toDbCommunity: ToDbCommunity;
}