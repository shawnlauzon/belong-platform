import type { ResourceClaim, ResourceClaimInput, ResourceClaimRow, ResourceClaimInsert, ResourceClaimUpdate } from '../types';

/**
 * Transform a domain claim object to a database claim record
 */
export function toResourceClaimInsertRow(
  claim: ResourceClaimInput,
): ResourceClaimInsert {
  return {
    resource_id: claim.resourceId,
    user_id: claim.userId,
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
): ResourceClaimUpdate {
  return {
    status: claim.status,
    notes: claim.notes,
  };
}

/**
 * Transform a database claim record to a ResourceClaim object
 */
export function toDomainResourceClaim(
  dbClaim: ResourceClaimRow,
): ResourceClaim {
  return {
    id: dbClaim.id,
    resourceId: dbClaim.resource_id,
    userId: dbClaim.user_id,
    timeslotId: dbClaim.timeslot_id ?? undefined,
    status: dbClaim.status,
    notes: dbClaim.notes ?? undefined,
    createdAt: new Date(dbClaim.created_at),
    updatedAt: new Date(dbClaim.updated_at),
  };
}