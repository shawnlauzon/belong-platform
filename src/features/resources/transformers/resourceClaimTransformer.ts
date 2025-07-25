import type {
  ResourceClaim,
  ResourceClaimInput,
  ResourceClaimSummary,
} from '../types';
import type {
  ResourceClaimInsertDbData,
  ResourceClaimUpdateDbData,
  ResourceClaimRowJoinResourceJoinTimeslot,
  ResourceClaimRow,
} from '../types/resourceRow';
import { toDomainResourceTimeslot } from './resourceTimeslotTransformer';

/**
 * Transform a domain claim object to a database claim record
 */
export function toResourceClaimInsertRow(
  claim: ResourceClaimInput,
): ResourceClaimInsertDbData {
  return {
    resource_id: claim.resourceId,
    timeslot_id: claim.timeslotId,
    status: claim.status,
    notes: claim.notes,
  };
}

/**
 * Transform a domain claim object to a database claim record for updates
 */
export function forDbClaimUpdate(
  claim: Partial<ResourceClaimInput>,
): ResourceClaimUpdateDbData {
  return {
    status: claim.status,
    notes: claim.notes,
  };
}

/**
 * Transform a database claim record to a ResourceClaim object
 */
export function toDomainResourceClaim(
  dbClaim: ResourceClaimRowJoinResourceJoinTimeslot,
): ResourceClaim {
  return {
    id: dbClaim.id,
    resourceId: dbClaim.resource_id,
    resourceOwnerId: dbClaim.resources.owner_id,
    claimantId: dbClaim.claimant_id,
    timeslotId: dbClaim.timeslot_id,
    timeslot: toDomainResourceTimeslot(dbClaim.resource_timeslots),
    status: dbClaim.status,
    notes: dbClaim.notes ?? undefined,
    createdAt: new Date(dbClaim.created_at),
    updatedAt: new Date(dbClaim.updated_at),
  };
}

/**
 * Transform a database claim record to a ResourceClaimSummary object
 */
export function toDomainResourceClaimSummary(
  dbClaim: ResourceClaimRow,
): ResourceClaimSummary {
  return {
    id: dbClaim.id,
    resourceId: dbClaim.resource_id,
    claimantId: dbClaim.claimant_id,
    timeslotId: dbClaim.timeslot_id,
    status: dbClaim.status,
  };
}
