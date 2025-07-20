import type {
  ResourceCategory,
  Resource,
  ResourceInput,
  ResourceSummary,
  ResourceType,
} from '../types';
import type { CommunitySummary } from '../../communities';
import type {
  ResourceRowWithRelations,
  ResourceInsertDbData,
  ResourceUpdateDbData,
} from '../types/resourceRow';
import { parsePostGisPoint, toPostGisPoint } from '../../../shared/utils';
import { toUserSummary } from '../../users/transformers/userTransformer';
import { toDomainCommunitySummary } from '@/features/communities/transformers/communityTransformer';

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
 * Transform a database resource record with joined relations to a Resource object
 */
export function toDomainResource(
  dbResource: ResourceRowWithRelations,
): Resource {
  // Handle potential array results from Supabase joins
  const owner = Array.isArray(dbResource.owner)
    ? dbResource.owner[0]
    : dbResource.owner;

  // Validate required joined data
  if (!owner) {
    throw new Error(`Resource ${dbResource.id} missing required owner data`);
  }

  // Transform owner to UserSummary
  const partialOwner = toUserSummary(owner);

  return {
    id: dbResource.id,
    type: dbResource.type as ResourceType,
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
    owner: partialOwner,
    communityIds: dbResource.resource_communities.map(
      (community) => community.community.id,
    ),
    communities: dbResource.resource_communities.map((community) =>
      toDomainCommunitySummary(community.community),
    ),
    status: dbResource.status,
    maxClaims: dbResource.max_claims ?? undefined,
    requiresApproval: dbResource.requires_approval || false,
    expiresAt: dbResource.expires_at
      ? new Date(dbResource.expires_at)
      : undefined,
  };
}

/**
 * Transform a database resource record with joined relations to a ResourceSummary object
 */
export function toResourceSummary(
  dbResource: ResourceRowWithRelations,
  communities: CommunitySummary[] = [],
): ResourceSummary {
  // Handle potential array results from Supabase joins
  const owner = Array.isArray(dbResource.owner)
    ? dbResource.owner[0]
    : dbResource.owner;

  // Validate required joined data
  if (!owner) {
    throw new Error(`Resource ${dbResource.id} missing required owner data`);
  }

  return {
    id: dbResource.id,
    type: dbResource.type as ResourceType,
    category: dbResource.category as ResourceCategory,
    title: dbResource.title,
    description: dbResource.description,
    locationName: dbResource.location_name || '',
    coordinates: dbResource.coordinates
      ? parsePostGisPoint(dbResource.coordinates)
      : undefined,
    ownerId: dbResource.owner_id,
    owner: toUserSummary(owner),
    communities,
    imageUrls: dbResource.image_urls || [],
    status: dbResource.status,
    maxClaims: dbResource.max_claims ?? undefined,
    requiresApproval: dbResource.requires_approval || false,
    expiresAt: dbResource.expires_at
      ? new Date(dbResource.expires_at)
      : undefined,
  };
}
