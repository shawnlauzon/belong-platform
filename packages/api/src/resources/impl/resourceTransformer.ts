import type { Database } from '@belongnetwork/types/database';
import type {
  Community,
  MeetupFlexibility,
  ResourceCategory,
  ResourceData,
  ResourceInfo,
  User,
} from '@belongnetwork/types';
import type { Resource } from '@belongnetwork/types';
import { parsePostGisPoint, toPostGisPoint } from '../../utils';
import { MESSAGE_AUTHENTICATION_REQUIRED } from '../../constants';

export type ResourceRow = Database['public']['Tables']['resources']['Row'];
export type ResourceInsertDbData =
  Database['public']['Tables']['resources']['Insert'];
export type ResourceUpdateDbData =
  Database['public']['Tables']['resources']['Update'];

/**
 * Transform a database resource record to a domain resource object
 */
export function toDomainResource(
  dbResource: ResourceRow,
  refs: { owner: User; community?: Community }
): Resource {
  if (!dbResource) {
    throw new Error(MESSAGE_AUTHENTICATION_REQUIRED);
  }

  if (dbResource.owner_id !== refs.owner.id) {
    throw new Error('Owner ID does not match');
  }

  if (dbResource.community_id && refs.community && dbResource.community_id !== refs.community.id) {
    throw new Error('Community ID does not match');
  }

  return {
    id: dbResource.id,
    type: dbResource.type as 'offer' | 'request',
    title: dbResource.title,
    description: dbResource.description,
    category: dbResource.category as ResourceCategory,
    location: dbResource.location ? parsePostGisPoint(dbResource.location) : undefined,
    isActive: dbResource.is_active !== false, // Default to true if not set
    availability: dbResource.availability ?? 'available',
    meetupFlexibility: dbResource.meetup_flexibility as MeetupFlexibility,
    parkingInfo: dbResource.parking_info ?? undefined,
    pickupInstructions: dbResource.pickup_instructions ?? undefined,
    imageUrls: dbResource.image_urls || [],
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
  const {
    communityId,
    imageUrls,
    pickupInstructions,
    parkingInfo,
    meetupFlexibility,
    isActive,
    ...rest
  } = resource;

  return {
    ...rest,
    owner_id: ownerId,
    community_id: communityId,
    image_urls: imageUrls,
    pickup_instructions: pickupInstructions,
    parking_info: parkingInfo,
    meetup_flexibility: meetupFlexibility,
    is_active: isActive,
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
    meetup_flexibility: resource.meetupFlexibility,
    parking_info: resource.parkingInfo,
    pickup_instructions: resource.pickupInstructions,
    image_urls: resource.imageUrls,
    is_active: resource.isActive,
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
  if (!dbResource) {
    throw new Error(MESSAGE_AUTHENTICATION_REQUIRED);
  }

  return {
    id: dbResource.id,
    type: dbResource.type as 'offer' | 'request',
    title: dbResource.title,
    description: dbResource.description,
    category: dbResource.category as ResourceCategory,
    location: dbResource.location ? parsePostGisPoint(dbResource.location) : undefined,
    isActive: dbResource.is_active !== false, // Default to true if not set
    availability: dbResource.availability ?? 'available',
    meetupFlexibility: dbResource.meetup_flexibility as MeetupFlexibility,
    parkingInfo: dbResource.parking_info ?? undefined,
    pickupInstructions: dbResource.pickup_instructions ?? undefined,
    imageUrls: dbResource.image_urls || [],
    createdAt: new Date(dbResource.created_at),
    updatedAt: new Date(dbResource.updated_at),
    ownerId: ownerId,
    communityId: communityId,
  };
}
