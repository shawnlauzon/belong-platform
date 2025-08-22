import type {
  ResourceCategory,
  Resource,
  ResourceInput,
  ResourceSummary,
} from '../types';
import type {
  ResourceInsertDbData,
  ResourceUpdateDbData,
  ResourceRowJoinCommunitiesJoinTimeslots,
} from '../types/resourceRow';
import { parsePostGisPoint, toPostGisPoint } from '../../../shared/utils';
import { toDomainResourceTimeslot } from './resourceTimeslotTransformer';

/**
 * Transform a domain resource object to a database resource record
 */
export function toResourceInsertRow(
  resource: Omit<ResourceInput, 'communityIds'>,
): ResourceInsertDbData {
  const {
    imageUrls,
    locationName,
    coordinates,
    claimLimit,
    claimLimitPer,
    requiresApproval,
    areTimeslotsFlexible,
    isRecurring,
    expiresAt,
    category,
    ...rest
  } = resource;

  return {
    ...rest,
    category: category || 'other',
    image_urls: imageUrls,
    location_name: locationName,
    coordinates: coordinates ? toPostGisPoint(coordinates) : undefined,
    claim_limit: claimLimit,
    claim_limit_per: claimLimitPer,
    requires_approval: requiresApproval,
    timeslots_flexible: areTimeslotsFlexible ?? true,
    is_recurring: isRecurring ?? false,
    expires_at: expiresAt?.toISOString(),
  };
}

/**
 * Transform a domain resource object to a database resource record
 */
export function forDbUpdate(
  resource: Partial<ResourceInput>,
): ResourceUpdateDbData {
  return {
    title: resource.title,
    description: resource.description,
    category: resource.category,
    type: resource.type,
    image_urls: resource.imageUrls,
    location_name: resource.locationName,
    coordinates: resource.coordinates
      ? toPostGisPoint(resource.coordinates)
      : undefined,
    // Note: ownerId is not part of ResourceData and should be handled by the calling function
    // Note: communityIds changes should be handled separately via resource_communities table
    status: resource.status,
    claim_limit: resource.claimLimit,
    claim_limit_per: resource.claimLimitPer,
    requires_approval: resource.requiresApproval,
    timeslots_flexible: resource.areTimeslotsFlexible,
    is_recurring: resource.isRecurring ?? false,
    expires_at: resource.expiresAt?.toISOString(),
  };
}

/**
 * Transform a database resource record to a Resource object
 */
export function toDomainResource(
  dbResource: ResourceRowJoinCommunitiesJoinTimeslots,
): Resource {
  return {
    id: dbResource.id,
    type: dbResource.type,
    title: dbResource.title,
    description: dbResource.description,
    category: dbResource.category as ResourceCategory,
    locationName: dbResource.location_name || '',
    coordinates: dbResource.coordinates
      ? parsePostGisPoint(dbResource.coordinates)
      : undefined,
    imageUrls: dbResource.image_urls || [],
    createdAt: new Date(dbResource.created_at),
    updatedAt: new Date(dbResource.updated_at),
    ownerId: dbResource.owner_id,
    communityIds:
      dbResource.resource_communities?.map((rc) => rc.community_id) || [],
    status: dbResource.status,
    claimLimit: dbResource.claim_limit ?? undefined,
    claimLimitPer:
      (dbResource.claim_limit_per as 'total' | 'timeslot') ?? undefined,
    requiresApproval: dbResource.requires_approval || false,
    areTimeslotsFlexible: dbResource.timeslots_flexible ?? true,
    isRecurring: dbResource.is_recurring ?? false,
    expiresAt: dbResource.expires_at
      ? new Date(dbResource.expires_at)
      : undefined,
    lastRenewedAt: dbResource.last_renewed_at
      ? new Date(dbResource.last_renewed_at)
      : undefined,
    timeslots:
      dbResource.resource_timeslots?.map(toDomainResourceTimeslot) || [],
    commentCount: dbResource.comment_count ?? 0,
  };
}

export function toDomainResourceSummary(
  dbResource: ResourceRowJoinCommunitiesJoinTimeslots,
): ResourceSummary {
  return {
    id: dbResource.id,
    type: dbResource.type,
    title: dbResource.title,
    status: dbResource.status,
    category: dbResource.category,
    ownerId: dbResource.owner_id,
    communityIds:
      dbResource.resource_communities?.map((rc) => rc.community_id) || [],
    commentCount: dbResource.comment_count ?? 0,
  };
}
