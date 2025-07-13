import { ResourceSummary } from '../../resources';
import { UserSummary } from '../../users';
import { CommunitySummary } from '../../communities';
import { toDomainCommunitySummary } from '../../communities/transformers/communityTransformer';
import { toGatheringWithJoinedRelations } from '../../gatherings/transformers/gatheringTransformer';
import { toResourceSummary } from '../../resources/transformers/resourceTransformer';
import { toUserSummary } from '../../users/transformers/userTransformer';
import type { ShoutoutInput, Shoutout } from '../types';
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
    resource: ResourceSummary;
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
    fromUserId: from_user_id,
    toUserId: to_user_id,
    resourceId: resource_id,
    communityId: community_id,
    message: rest.message,
    imageUrls: image_urls || [],
    createdAt: new Date(created_at),
    updatedAt: new Date(updated_at),
    fromUser: refs.fromUser,
    toUser: refs.toUser,
    resource: refs.resource,
    community: refs.community,
  };
}

/**
 * Transform a domain shoutout data object to a database shoutout insert record
 */
export function toShoutoutInsertRow(
  shoutoutData: ShoutoutInput,
  fromUserId: string,
): ShoutoutInsertRow {
  const { toUserId, communityId, imageUrls, message } = shoutoutData;

  // Common fields
  const commonFields = {
    message,
    from_user_id: fromUserId,
    to_user_id: toUserId,
    community_id: communityId,
    image_urls: imageUrls || [],
  };

  // Special case: resource vs gathering
  if ('resourceId' in shoutoutData) {
    return {
      ...commonFields,
      resource_id: shoutoutData.resourceId,
      gathering_id: null,
    };
  } else {
    return {
      ...commonFields,
      resource_id: null,
      gathering_id: shoutoutData.gatheringId,
    };
  }
}

/**
 * Transform a domain shoutout data object to a database shoutout update record
 */
export function toShoutoutUpdateRow(
  shoutoutData: Partial<ShoutoutInput>,
): ShoutoutUpdateRow {
  const { toUserId, communityId, imageUrls, message } = shoutoutData;

  const baseUpdate = {
    message,
    // Note: fromUserId cannot be updated via this method - it's set at creation
    from_user_id: undefined,
    to_user_id: toUserId,
    community_id: communityId,
    image_urls: imageUrls,
  };

  if (shoutoutData && 'resourceId' in shoutoutData) {
    return {
      ...baseUpdate,
      resource_id: shoutoutData.resourceId,
      gathering_id: null,
    };
  } else if (shoutoutData && 'gatheringId' in shoutoutData) {
    return {
      ...baseUpdate,
      resource_id: null,
      gathering_id: shoutoutData.gatheringId,
    };
  } else {
    return {
      ...baseUpdate,
      resource_id: undefined,
      gathering_id: undefined,
    };
  }
}

/**
 * Transform a database shoutout record with joined relations to a Shoutout object
 */
export function toShoutoutWithJoinedRelations(
  dbShoutout: ShoutoutRowWithRelations,
): Shoutout {
  // Handle potential array results from Supabase joins
  const fromUser = Array.isArray(dbShoutout.fromUser)
    ? dbShoutout.fromUser[0]
    : dbShoutout.fromUser;
  const toUser = Array.isArray(dbShoutout.toUser)
    ? dbShoutout.toUser[0]
    : dbShoutout.toUser;
  const resource = Array.isArray(dbShoutout.resource)
    ? dbShoutout.resource[0]
    : dbShoutout.resource;
  const gathering = Array.isArray(dbShoutout.gathering)
    ? dbShoutout.gathering[0]
    : dbShoutout.gathering;
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
    throw new Error(`Shoutout ${dbShoutout.id} missing required community data`);
  }

  // Validate that exactly one target (resource OR gathering) exists
  if (!resource && !gathering) {
    throw new Error(`Shoutout ${dbShoutout.id} missing required target (resource or gathering) data`);
  }
  if (resource && gathering) {
    throw new Error(`Shoutout ${dbShoutout.id} has both resource and gathering data - should have exactly one`);
  }

  // Common shoutout data (90% of the transformation)
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

  // Special case: Resource shoutout
  if (resource) {
    if (!resource.owner) {
      throw new Error(`Shoutout ${dbShoutout.id} resource missing required owner data`);
    }

    return {
      ...commonShoutout,
      resourceId: dbShoutout.resource_id!,
      resource: toResourceSummary(resource),
    } as Shoutout;
  }

  // Special case: Gathering shoutout
  if (gathering) {
    if (!gathering.organizer || !gathering.community) {
      throw new Error(`Shoutout ${dbShoutout.id} gathering missing required organizer or community data`);
    }

    return {
      ...commonShoutout,
      gatheringId: dbShoutout.gathering_id!,
      gathering: toGatheringWithJoinedRelations(gathering),
    } as Shoutout;
  }

  // This should never happen due to validation above
  throw new Error(`Shoutout ${dbShoutout.id} has neither resource nor gathering data`);
}
