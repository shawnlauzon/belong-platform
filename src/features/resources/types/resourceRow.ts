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

export type ResourceTimeslotRow =
  Database['public']['Tables']['resource_timeslots']['Row'];
export type ResourceTimeslotInsertDbData =
  Database['public']['Tables']['resource_timeslots']['Insert'];
export type ResourceTimeslotUpdateDbData =
  Database['public']['Tables']['resource_timeslots']['Update'];

export type ResourceClaimRow =
  Database['public']['Tables']['resource_claims']['Row'];
export type ResourceClaimInsertDbData =
  Database['public']['Tables']['resource_claims']['Insert'];
export type ResourceClaimUpdateDbData =
  Database['public']['Tables']['resource_claims']['Update'];

export type ResourceStatus = Database['public']['Enums']['resource_status'];
export type ResourceClaimStatus =
  Database['public']['Enums']['resource_claim_status'];
export type ResourceCategory = Database['public']['Enums']['resource_category'];
