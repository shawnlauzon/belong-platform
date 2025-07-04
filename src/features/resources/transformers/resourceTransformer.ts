import type {
  ResourceCategory,
  Resource,
  ResourceData,
  ResourceInfo,
} from '../types';
import type {
  ResourceRow,
  ResourceInsertDbData,
  ResourceUpdateDbData,
} from '../types/database';
import { parsePostGisPoint, toPostGisPoint } from '../../../shared/utils';
import { User } from '../../users';
import { Community } from '../../communities';

/**
 * Transform a database resource record to a domain resource object
 */
export function toDomainResource(
  dbResource: ResourceRow,
  refs: { owner: User; community?: Community }
): Resource {
  if (dbResource.owner_id !== refs.owner.id) {
    throw new Error('Owner ID does not match');
  }

  if (
    dbResource.community_id &&
    refs.community &&
    dbResource.community_id !== refs.community.id
  ) {
    throw new Error('Community ID does not match');
  }

  return {
    id: dbResource.id,
    type: dbResource.type as 'offer' | 'request',
    title: dbResource.title,
    description: dbResource.description,
    category: dbResource.category as ResourceCategory,
    location: dbResource.location
      ? parsePostGisPoint(dbResource.location)
      : undefined,
    availability: dbResource.availability ?? 'available',
    imageUrls: dbResource.image_urls || [],
    deletedAt: dbResource.deleted_at
      ? new Date(dbResource.deleted_at)
      : undefined,
    deletedBy: dbResource.deleted_by ?? undefined,
    createdAt: new Date(dbResource.created_at),
    updatedAt: new Date(dbResource.updated_at),
    owner: refs.owner,
    community: refs.community,
  };
}

/**
 * Transform a domain resource object to a database resource record
 */
export function forDbInsert(
  resource: ResourceData,
  ownerId: string
): ResourceInsertDbData {
  const { communityId, imageUrls, ...rest } = resource;

  return {
    ...rest,
    owner_id: ownerId,
    community_id: communityId,
    image_urls: imageUrls,
    location: resource.location ? toPostGisPoint(resource.location) : undefined,
  };
}

/**
 * Transform a domain resource object to a database resource record
 */
export function forDbUpdate(
  resource: Partial<ResourceData>
): ResourceUpdateDbData {
  return {
    title: resource.title,
    description: resource.description,
    category: resource.category,
    type: resource.type,
    availability: resource.availability,
    image_urls: resource.imageUrls,
    location: resource.location ? toPostGisPoint(resource.location) : undefined,
    // Note: ownerId is not part of ResourceData and should be handled by the calling function
    community_id: resource.communityId,
  };
}

/**
 * Transform a database resource record to a ResourceInfo object (lightweight for lists)
 */
export function toResourceInfo(
  dbResource: ResourceRow,
  ownerId: string,
  communityId: string
): ResourceInfo {
  return {
    id: dbResource.id,
    type: dbResource.type as 'offer' | 'request',
    title: dbResource.title,
    description: dbResource.description,
    category: dbResource.category as ResourceCategory,
    location: dbResource.location
      ? parsePostGisPoint(dbResource.location)
      : undefined,
    availability: dbResource.availability ?? 'available',
    imageUrls: dbResource.image_urls || [],
    deletedAt: dbResource.deleted_at
      ? new Date(dbResource.deleted_at)
      : undefined,
    deletedBy: dbResource.deleted_by ?? undefined,
    createdAt: new Date(dbResource.created_at),
    updatedAt: new Date(dbResource.updated_at),
    ownerId: ownerId,
    communityId: communityId,
  };
}
