import type {
  ResourceCategory,
  Resource,
  ResourceInput,
} from '../types';
import type {
  ResourceRowBasic,
  ResourceInsertDbData,
  ResourceUpdateDbData,
} from '../types/resourceRow';
import { parsePostGisPoint, toPostGisPoint } from '../../../shared/utils';

/**
 * Transform a domain resource object to a database resource record
 */
export function toResourceInsertRow(
  resource: Omit<ResourceInput, 'communityIds'> & { ownerId: string },
): ResourceInsertDbData {
  const {
    imageUrls,
    ownerId,
    locationName,
    coordinates,
    maxClaims,
    requiresApproval,
    expiresAt,
    ...rest
  } = resource;

  return {
    ...rest,
    owner_id: ownerId,
    image_urls: imageUrls,
    location_name: locationName,
    coordinates: coordinates ? toPostGisPoint(coordinates) : undefined,
    max_claims: maxClaims,
    requires_approval: requiresApproval,
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
    max_claims: resource.maxClaims,
    requires_approval: resource.requiresApproval,
    expires_at: resource.expiresAt?.toISOString(),
  };
}

/**
 * Transform a database resource record to a Resource object
 */
export function toDomainResource(
  dbResource: ResourceRowBasic,
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
    communityIds: [], // Will be populated separately via resource_communities table
    status: dbResource.status,
    maxClaims: dbResource.max_claims ?? undefined,
    requiresApproval: dbResource.requires_approval || false,
    expiresAt: dbResource.expires_at
      ? new Date(dbResource.expires_at)
      : undefined,
  };
}

