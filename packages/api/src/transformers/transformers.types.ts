import type { Database } from '../types/database';
import type { Community, Resource, User } from '../types/entities';

export type CommunityRow = Database['public']['Tables']['communities']['Row'];

export type UserRow = Database['public']['Tables']['profiles']['Row'];

export type ResourceRow = Database['public']['Tables']['resources']['Row'];

export interface CommunityTransformers {
  toDomainCommunity: (dbCommunity: CommunityRow) => Community;
  toDbCommunity: (community: Community) => CommunityRow;
}

export interface UserTransformers {
  toDomainUser: (dbUser: UserRow) => User;
  toDbUser: (
    user: Partial<User>
  ) => Partial<Database['public']['Tables']['profiles']['Insert']>;
}

export interface ResourceTransformers {
  toDomainResource: (dbResource: ResourceRow) => Resource;
  toDbResource: (
    resource: Partial<Resource>
  ) => Partial<Database['public']['Tables']['resources']['Insert']>;
}

export interface Transformers
  extends CommunityTransformers,
    UserTransformers,
    ResourceTransformers {}
