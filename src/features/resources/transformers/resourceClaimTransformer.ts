import type {
  ResourceClaim,
  ResourceClaimInput,
  ResourceClaimSummary,
} from '../types';
import type {
  ResourceClaimInsertDbData,
  ResourceClaimUpdateDbData,
  ResourceClaimRowWithRelations,
} from '../types/resourceRow';
import { toResourceSummary } from './resourceTransformer';
import { toDomainResourceTimeslot } from './resourceTimeslotTransformer';
import { toUserSummary } from '@/features/users/transformers/userTransformer';

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
  dbClaim: ResourceClaimRowWithRelations,
): ResourceClaim {
  return {
    id: dbClaim.id,
    resourceId: dbClaim.resource_id,
    resource: toResourceSummary(dbClaim.resource),
    userId: dbClaim.user_id,
    user: toUserSummary(dbClaim.user),
    timeslotId: dbClaim.timeslot_id!,
    timeslot: toDomainResourceTimeslot(dbClaim.timeslot),
    status: dbClaim.status,
    notes: dbClaim.notes ?? undefined,
    createdAt: new Date(dbClaim.created_at),
    updatedAt: new Date(dbClaim.updated_at),
  };
}

/**
 * Transform a database claim record with relations to a ResourceClaim object
 */
export function toDomainResourceClaimWithRelations(
  dbClaim: ResourceClaimRowWithRelations,
): ResourceClaim {
  // Handle potential array results from Supabase joins
  const resource = Array.isArray(dbClaim.resource)
    ? dbClaim.resource[0]
    : dbClaim.resource;
    
  const timeslot = Array.isArray(dbClaim.timeslot)
    ? dbClaim.timeslot[0]
    : dbClaim.timeslot;

  // Validate required joined data
  if (!resource) {
    throw new Error(
      `ResourceClaim ${dbClaim.id} missing required resource data`,
    );
  }
  
  if (!timeslot) {
    throw new Error(
      `ResourceClaim ${dbClaim.id} missing required timeslot data`,
    );
  }

  return {
    id: dbClaim.id,
    resourceId: dbClaim.resource_id,
    userId: dbClaim.user_id,
    timeslotId: dbClaim.timeslot_id!,
    status: dbClaim.status,
    notes: dbClaim.notes ?? undefined,
    createdAt: new Date(dbClaim.created_at),
    updatedAt: new Date(dbClaim.updated_at),
    user: toUserSummary(dbClaim.user),
    resource: toResourceSummary(resource),
    timeslot: toDomainResourceTimeslot(timeslot),
  };
}

/**
 * Transform a basic database claim record to a ResourceClaimSummary object
 */
export function toDomainResourceClaimSummary(
  dbClaim: ResourceClaimRowWithRelations,
): ResourceClaimSummary {
  return {
    id: dbClaim.id,
    resourceId: dbClaim.resource_id,
    userId: dbClaim.user_id,
    timeslotId: dbClaim.timeslot_id!,
    status: dbClaim.status,
    notes: dbClaim.notes ?? undefined,
    user: toUserSummary(dbClaim.user),
    resource: toResourceSummary(dbClaim.resource),
  };
}
