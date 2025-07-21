import type { Shoutout, ShoutoutInput } from '../types';

import {
  ShoutoutInsertRow,
  ShoutoutRow,
  ShoutoutUpdateRow,
} from '../types/shoutoutRow';

/**
 * Transform a database shoutout record to a domain shoutout object
 */
export function toDomainShoutout(dbShoutout: ShoutoutRow): Shoutout {
  const {
    sender_id,
    receiver_id,
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
    senderId: sender_id,
    receiverId: receiver_id,
    resourceId: resource_id,
    communityId: community_id,
    message,
    imageUrls: image_urls || [],
    createdAt: new Date(created_at),
    updatedAt: new Date(updated_at),
  };
}

export function toShoutoutInsertRow(
  shoutoutData: ShoutoutInput,
): ShoutoutInsertRow {
  const { imageUrls, message } = shoutoutData;

  return {
    message,
    receiver_id: shoutoutData.receiverId,
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
