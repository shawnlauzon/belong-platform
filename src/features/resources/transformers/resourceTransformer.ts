import type { ResourceCategory, Resource, ResourceInput } from '../types';
import type {
  ResourceRowWithRelations,
  ResourceInsertDbData,
  ResourceUpdateDbData,
} from '../types/resourceRow';
import { parsePostGisPoint, toPostGisPoint } from '../../../shared/utils';

/**
 * Transform a domain resource object to a database resource record
 */
export function toResourceInsertRow(
  resource: ResourceInput & { ownerId: string },
): ResourceInsertDbData {
  const {
    communityId,
    imageUrls,
    ownerId,
    locationName,
    coordinates,
    ...rest
  } = resource;

  return {
    ...rest,
    owner_id: ownerId,
    community_id: communityId,
    image_urls: imageUrls,
    location_name: locationName,
    coordinates: coordinates ? toPostGisPoint(coordinates) : undefined,
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
    community_id: resource.communityId,
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
  const partialOwner = {
    id: owner.id,
    firstName: owner.user_metadata?.first_name || '',
    avatarUrl: owner.user_metadata?.avatar_url,
    createdAt: new Date(owner.created_at),
    updatedAt: new Date(owner.updated_at),
  };

  return {
    id: dbResource.id,
    type: dbResource.type as 'offer' | 'request',
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
    communityId: dbResource.community_id,
  };
}
