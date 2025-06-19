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

  const { owner_id, community_id, location, created_at, updated_at, ...rest } =
    dbResource;

  if (owner_id !== refs.owner.id) {
    throw new Error('Owner ID does not match');
  }

  if (community_id && refs.community && community_id !== refs.community.id) {
    throw new Error('Community ID does not match');
  }

  return {
    ...rest,
    id: dbResource.id,
    type: rest.type as 'offer' | 'request',
    title: rest.title,
    description: rest.description,
    category: rest.category as ResourceCategory,
    location: location ? parsePostGisPoint(location) : undefined,
    isActive: rest.is_active !== false, // Default to true if not set
    availability: rest.availability ?? 'available',
    meetupFlexibility: rest.meetup_flexibility as MeetupFlexibility,
    parkingInfo: rest.parking_info ?? undefined,
    pickupInstructions: rest.pickup_instructions ?? undefined,
    createdAt: new Date(created_at),
    updatedAt: new Date(updated_at),
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
  resource: Partial<ResourceData>,
  ownerId?: string
): ResourceUpdateDbData {
  return {
    ...resource,
    owner_id: ownerId,
    location: resource.location ? toPostGisPoint(resource.location) : undefined,
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
