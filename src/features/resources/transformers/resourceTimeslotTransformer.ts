import type { ResourceTimeslot, ResourceTimeslotInput } from '../types';
import type {
  ResourceTimeslotRowWithRelations,
  ResourceTimeslotInsertDbData,
  ResourceTimeslotUpdateDbData,
  ResourceClaimRow,
} from '../types/resourceRow';
import { toDomainResourceClaim } from './resourceClaimTransformer';

/**
 * Transform a domain timeslot object to a database timeslot record
 */
export function toResourceTimeslotInsertRow(
  timeslot: ResourceTimeslotInput,
): ResourceTimeslotInsertDbData {
  return {
    resource_id: timeslot.resourceId,
    start_time: timeslot.startTime.toISOString(),
    end_time: timeslot.endTime.toISOString(),
    max_claims: timeslot.maxClaims,
  };
}

/**
 * Transform a domain timeslot object to a database timeslot record for updates
 */
export function forDbTimeslotUpdate(
  timeslot: Partial<ResourceTimeslotInput>,
): ResourceTimeslotUpdateDbData {
  return {
    start_time: timeslot.startTime?.toISOString(),
    end_time: timeslot.endTime?.toISOString(),
    max_claims: timeslot.maxClaims,
  };
}

/**
 * Transform a database timeslot record to a ResourceTimeslot object
 */
export function toDomainResourceTimeslot(
  dbTimeslot: ResourceTimeslotRowWithRelations,
): ResourceTimeslot {
  return {
    id: dbTimeslot.id,
    resourceId: dbTimeslot.resource_id,
    startTime: new Date(dbTimeslot.start_time),
    endTime: new Date(dbTimeslot.end_time),
    maxClaims: dbTimeslot.max_claims,
    claims: dbTimeslot.resource_claims
      ? dbTimeslot.resource_claims.map(toDomainResourceClaim)
      : [],
    status: calculateTimeslotStatus(
      dbTimeslot.resource_claims,
      dbTimeslot.max_claims,
    ),
    createdAt: new Date(dbTimeslot.created_at),
    updatedAt: new Date(dbTimeslot.updated_at),
  };
}

function calculateTimeslotStatus(
  claims: ResourceClaimRow[],
  maxClaims: number,
): 'available' | 'maybeAvailable' | 'unavailable' {
  const validClaims = claims.filter(
    (claim) => claim.status !== 'rejected' && claim.status !== 'cancelled',
  );

  if (validClaims.length < maxClaims) {
    return 'available';
  }

  if (
    validClaims.every(
      (claim) => claim.status === 'approved' || claim.status === 'completed',
    )
  ) {
    return 'unavailable';
  }

  return 'maybeAvailable';
}
