import type { Shoutout, ShoutoutInput, ShoutoutInputRefs } from '../types';

import {
  ShoutoutInsertRow,
  ShoutoutRow,
  ShoutoutUpdateRow,
} from '../types/shoutoutRow';

/**
 * Transform a database shoutout record to a domain shoutout object
 */
export function toDomainShoutout(
  dbShoutout: ShoutoutRow,
): Shoutout {
  const {
    from_user_id,
    to_user_id,
    resource_id,
    community_id,
    image_urls,
    created_at,
    updated_at,
    id,
    message,
  } = dbShoutout;

  return {
    id,
    fromUserId: from_user_id,
    toUserId: to_user_id,
    resourceId: resource_id,
    communityId: community_id,
    message,
    imageUrls: image_urls || [],
    createdAt: new Date(created_at),
    updatedAt: new Date(updated_at),
  };
}

export function toShoutoutInsertRow(
  shoutoutData: ShoutoutInput & ShoutoutInputRefs,
): ShoutoutInsertRow {
  const { imageUrls, message } = shoutoutData;

  return {
    message,
    from_user_id: shoutoutData.fromUserId,
    to_user_id: shoutoutData.toUserId,
    community_id: shoutoutData.communityId,
    image_urls: imageUrls || [],
    resource_id: shoutoutData.resourceId,
  };
}

/**
 * Transform a domain shoutout data object to a database shoutout update record
 */
export function toShoutoutUpdateRow(
  shoutoutData: Partial<ShoutoutInput>,
): ShoutoutUpdateRow {
  const { imageUrls, message } = shoutoutData;

  return {
    message,
    image_urls: imageUrls,
  };
}

