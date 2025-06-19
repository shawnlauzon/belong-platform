import type { Database } from '@belongnetwork/types/database';
import type {
  ThanksData,
  Thanks,
  ThanksInfo,
  User,
  Resource,
} from '@belongnetwork/types';

export type ThanksRow = Database['public']['Tables']['thanks']['Row'];
export type ThanksInsertDbData = Database['public']['Tables']['thanks']['Insert'];
export type ThanksUpdateDbData = Database['public']['Tables']['thanks']['Update'];

/**
 * Transform a database thanks record to a domain thanks object
 */
export function toDomainThanks(
  dbThanks: ThanksRow,
  refs: { fromUser: User; toUser: User; resource: Resource }
): Thanks {
  const {
    from_user_id,
    to_user_id,
    resource_id,
    image_urls,
    impact_description,
    created_at,
    updated_at,
    ...rest
  } = dbThanks;

  if (from_user_id !== refs.fromUser.id) {
    throw new Error('From user ID does not match');
  }

  if (to_user_id !== refs.toUser.id) {
    throw new Error('To user ID does not match');
  }

  if (resource_id !== refs.resource.id) {
    throw new Error('Resource ID does not match');
  }

  return {
    ...rest,
    id: dbThanks.id,
    message: rest.message,
    imageUrls: image_urls || [],
    impactDescription: impact_description || undefined,
    createdAt: new Date(created_at),
    updatedAt: new Date(updated_at),
    fromUser: refs.fromUser,
    toUser: refs.toUser,
    resource: refs.resource,
  };
}

/**
 * Transform a domain thanks data object to a database thanks insert record
 */
export function forDbInsert(
  thanksData: ThanksData,
  fromUserId: string
): ThanksInsertDbData {
  const {
    fromUserId: _fromUserId, // Extract and ignore the fromUserId from data
    toUserId,
    resourceId,
    imageUrls,
    impactDescription,
    message,
  } = thanksData;

  return {
    message,
    from_user_id: fromUserId,
    to_user_id: toUserId,
    resource_id: resourceId,
    image_urls: imageUrls || [],
    impact_description: impactDescription || null,
  };
}

/**
 * Transform a domain thanks data object to a database thanks update record
 */
export function forDbUpdate(
  thanksData: Partial<ThanksData>
): ThanksUpdateDbData {
  const {
    fromUserId,
    toUserId,
    resourceId,
    imageUrls,
    impactDescription,
    message,
  } = thanksData;

  return {
    message,
    from_user_id: fromUserId,
    to_user_id: toUserId,
    resource_id: resourceId,
    image_urls: imageUrls,
    impact_description: impactDescription || null,
  };
}

/**
 * Transform a database thanks record to a ThanksInfo object (lightweight for lists)
 */
export function toThanksInfo(
  dbThanks: ThanksRow,
  fromUserId: string,
  toUserId: string,
  resourceId: string,
  communityId: string
): ThanksInfo {
  return {
    id: dbThanks.id,
    message: dbThanks.message,
    imageUrls: dbThanks.image_urls || [],
    impactDescription: dbThanks.impact_description || undefined,
    createdAt: new Date(dbThanks.created_at),
    updatedAt: new Date(dbThanks.updated_at),
    fromUserId: fromUserId,
    toUserId: toUserId,
    resourceId: resourceId,
    communityId: communityId,
  };
}