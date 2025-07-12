import { ProfileRow } from '@/features/users/types/profileRow';
import type { Database } from '../../../shared/types/database';
import { CommunityRow } from '@/features/communities';

export const SELECT_RESOURCE_WITH_RELATIONS = `
    *,
    owner:profiles!owner_id(*),
    community:communities!community_id(*)
  `;
export type ResourceRowWithRelations = ResourceRow & {
  owner: ProfileRow;
  community: CommunityRow;
};

export type ResourceRow = Database['public']['Tables']['resources']['Row'];
export type ResourceInsertDbData =
  Database['public']['Tables']['resources']['Insert'];
export type ResourceUpdateDbData =
  Database['public']['Tables']['resources']['Update'];

export type ResourceResponseRow =
  Database['public']['Tables']['resource_responses']['Row'];
export type ResourceResponseInsertDbData =
  Database['public']['Tables']['resource_responses']['Insert'];
export type ResourceResponseUpdateDbData =
  Database['public']['Tables']['resource_responses']['Update'];
