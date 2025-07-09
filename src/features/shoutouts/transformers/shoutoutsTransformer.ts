import { ResourceDetail } from '../../resources';
import { UserDetail } from '../../users';
import type { ShoutoutData, ShoutoutDetail, ShoutoutInfo } from '../types';
import {
  ShoutoutInsertDbData,
  ShoutoutRow,
  ShoutoutUpdateDbData,
} from '../types/database';

/**
 * Transform a database shoutout record to a domain shoutout object
 */
export function toDomainShoutout(
  dbShoutout: ShoutoutRow,
  refs: { fromUser: UserDetail; toUser: UserDetail; resource: ResourceDetail },
): ShoutoutDetail {
  const {
    from_user_id,
    to_user_id,
    resource_id,
    image_urls,
    created_at,
    updated_at,
    ...rest
  } = dbShoutout;

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
    id: dbShoutout.id,
    message: rest.message,
    imageUrls: image_urls || [],
    createdAt: new Date(created_at),
    updatedAt: new Date(updated_at),
    fromUser: refs.fromUser,
    toUser: refs.toUser,
    resource: refs.resource,
  };
}

/**
 * Transform a domain shoutout data object to a database shoutout insert record
 */
export function forDbInsert(
  shoutoutData: ShoutoutData,
  fromUserId: string,
): ShoutoutInsertDbData {
  const { toUserId, resourceId, imageUrls, message } = shoutoutData;

  return {
    message,
    from_user_id: fromUserId,
    to_user_id: toUserId,
    resource_id: resourceId,
    image_urls: imageUrls || [],
  };
}

/**
 * Transform a domain shoutout data object to a database shoutout update record
 */
export function forDbUpdate(
  shoutoutData: Partial<ShoutoutData>,
): ShoutoutUpdateDbData {
  const { toUserId, resourceId, imageUrls, message } = shoutoutData;

  return {
    message,
    // Note: fromUserId cannot be updated via this method - it's set at creation
    from_user_id: undefined,
    to_user_id: toUserId,
    resource_id: resourceId,
    image_urls: imageUrls,
  };
}

/**
 * Transform a database shoutout record to a ShoutoutInfo object (lightweight for lists)
 */
export function toShoutoutInfo(
  dbShoutout: ShoutoutRow,
  fromUserId: string,
  toUserId: string,
  resourceId: string,
): ShoutoutInfo {
  return {
    id: dbShoutout.id,
    message: dbShoutout.message,
    imageUrls: dbShoutout.image_urls || [],
    createdAt: new Date(dbShoutout.created_at),
    updatedAt: new Date(dbShoutout.updated_at),
    fromUserId: fromUserId,
    toUserId: toUserId,
    resourceId: resourceId,
  };
}
