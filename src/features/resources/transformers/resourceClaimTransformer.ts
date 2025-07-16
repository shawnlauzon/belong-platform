import type { ResourceClaim, ResourceClaimInput } from '../types';
import type {
  ResourceClaimRow,
  ResourceClaimInsertDbData,
  ResourceClaimUpdateDbData,
} from '../types/resourceRow';

/**
 * Transform a domain claim object to a database claim record
 */
export function toResourceClaimInsertRow(
  claim: ResourceClaimInput & { userId: string },
): ResourceClaimInsertDbData {
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
  dbClaim: ResourceClaimRow,
): ResourceClaim {
  return {
    id: dbClaim.id,
    resourceId: dbClaim.resource_id,
    userId: dbClaim.user_id,
    timeslotId: dbClaim.timeslot_id,
    status: dbClaim.status,
    notes: dbClaim.notes ?? undefined,
    createdAt: new Date(dbClaim.created_at),
    updatedAt: new Date(dbClaim.updated_at),
  };
}
