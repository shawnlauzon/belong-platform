import { ResourceSummary } from '../../resources';
import { UserSummary } from '../../users';
import { CommunitySummary } from '../../communities';
import { toDomainCommunitySummary } from '../../communities/transformers/communityTransformer';
import { toResourceSummary } from '../../resources/transformers/resourceTransformer';
import { toUserSummary } from '../../users/transformers/userTransformer';
import type { Shoutout, ShoutoutInput, ShoutoutInputRefs } from '../types';

import {
  ShoutoutInsertRow,
  ShoutoutRow,
  ShoutoutRowWithRelations,
  ShoutoutUpdateRow,
} from '../types/shoutoutRow';

/**
 * Transform a database shoutout record to a domain shoutout object
 */
export function toDomainShoutout(
  dbShoutout: ShoutoutRow,
  refs: {
    fromUser: UserSummary;
    toUser: UserSummary;
    resource?: ResourceSummary;
    community: CommunitySummary;
  },
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

  if (from_user_id !== refs.fromUser.id) {
    throw new Error('From user ID does not match');
  }

  if (to_user_id !== refs.toUser.id) {
    throw new Error('To user ID does not match');
  }

  if (resource_id && refs.resource && resource_id !== refs.resource.id) {
    throw new Error('Resource ID does not match');
  }

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
    fromUser: refs.fromUser,
    toUser: refs.toUser,
    resource: refs.resource,
    community: refs.community,
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

/**
 * Transform a database shoutout record with joined relations to a Shoutout object
 */
export function toShoutoutWithJoinedRelations(
  dbShoutout: ShoutoutRowWithRelations,
): Shoutout {
  // Handle potential array results from Supabase joins
  const fromUser = Array.isArray(dbShoutout.from_user)
    ? dbShoutout.from_user[0]
    : dbShoutout.from_user;
  const toUser = Array.isArray(dbShoutout.to_user)
    ? dbShoutout.to_user[0]
    : dbShoutout.to_user;
  const resource = Array.isArray(dbShoutout.resource)
    ? dbShoutout.resource[0]
    : dbShoutout.resource;
  const community = Array.isArray(dbShoutout.community)
    ? dbShoutout.community[0]
    : dbShoutout.community;

  // Validate required joined data
  if (!fromUser) {
    throw new Error(`Shoutout ${dbShoutout.id} missing required fromUser data`);
  }
  if (!toUser) {
    throw new Error(`Shoutout ${dbShoutout.id} missing required toUser data`);
  }
  if (!community) {
    throw new Error(
      `Shoutout ${dbShoutout.id} missing required community data`,
    );
  }

  // Common shoutout data
  const commonShoutout = {
    id: dbShoutout.id,
    message: dbShoutout.message,
    imageUrls: dbShoutout.image_urls || [],
    createdAt: new Date(dbShoutout.created_at),
    updatedAt: new Date(dbShoutout.updated_at),
    fromUserId: dbShoutout.from_user_id,
    fromUser: toUserSummary(fromUser),
    toUserId: dbShoutout.to_user_id,
    toUser: toUserSummary(toUser),
    communityId: dbShoutout.community_id,
    community: toDomainCommunitySummary(community),
  };

  // Handle resource shoutout
  if (resource) {
    if (!resource.owner) {
      throw new Error(
        `Shoutout ${dbShoutout.id} resource missing required owner data`,
      );
    }

    return {
      ...commonShoutout,
      resourceId: dbShoutout.resource_id!,
      resource: toResourceSummary(resource),
    } as Shoutout;
  }

  // Handle general shoutout (no resource)
  return {
    ...commonShoutout,
    resourceId: dbShoutout.resource_id || undefined,
    resource: undefined,
  } as Shoutout;
}
