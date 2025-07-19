import { ProfileRow } from '@/features/users/types/profileRow';
import type { Database } from '../../../shared/types/database';
import { CommunityRow } from '@/features/communities';

export const SELECT_RESOURCE_WITH_RELATIONS = `
*,
owner:profiles!owner_id(*),
resource_communities!inner(
  community:communities(*)
)
`;

export type ResourceRowWithRelations = ResourceRow & {
  owner: ProfileRow;
  resource_communities: {
    community: CommunityRow;
  }[];
};

export const SELECT_RESOURCE_TIMESLOT_WITH_RELATIONS = `
    *,
    resource_claims(*)
  `;
export type ResourceTimeslotRowWithRelations = ResourceTimeslotRow & {
  resource_claims: ResourceClaimRow[];
};

export const SELECT_RESOURCE_CLAIMS_WITH_RELATIONS = `
    *,
    resource:resources!inner(
      *,
      owner:profiles!owner_id(*),
      resource_communities!inner(
        community:communities(*)
      )
    ),
    user:profiles!user_id(*),
    timeslot:resource_timeslots!inner(
      *,
      resource_claims(*)
    )
  `;
export type ResourceClaimRowWithRelations = ResourceClaimRow & {
  resource: ResourceRowWithRelations;
  user: ProfileRow;
  timeslot: ResourceTimeslotRowWithRelations;
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
