import type { Database } from '../../../shared/types/database';

export const SELECT_RESOURCES_JOIN_COMMUNITIES_JOIN_TIMESLOTS = `*, resource_communities!inner(community_id), resource_timeslots(*), expires_at`;

export type ResourceRowJoinCommunitiesJoinTimeslots = ResourceRow & {
  resource_communities?: { community_id: string }[];
  resource_timeslots?: ResourceTimeslotRow[];
  expires_at?: string | null;
};

export const SELECT_RESOURCE_CLAIMS_BASIC = `*`;

export const SELECT_RESOURCE_CLAIMS_JOIN_RESOURCE_JOIN_TIMESLOT = `*, resources!inner(owner_id), resource_timeslots(*)`;
export type ResourceClaimRowJoinResourceJoinTimeslot = ResourceClaimRow & {
  resources: { owner_id: string };
  resource_timeslots: ResourceTimeslotRow;
};

export const SELECT_RESOURCE_TIMESLOT_BASIC = `*`;

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

// Type and enum for ResourceType
export type ResourceType = Database['public']['Enums']['resource_type'];

export type ResourceTimeslotStatus =
  Database['public']['Enums']['resource_timeslot_status'];

export type CommitmentLevel = Database['public']['Enums']['commitment_level_enum'] | null;
