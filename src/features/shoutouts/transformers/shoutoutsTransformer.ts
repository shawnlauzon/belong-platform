import { ResourceSummary } from '../../resources';
import { UserSummary } from '../../users';
import { CommunitySummary } from '../../communities';
import { toDomainCommunitySummary } from '../../communities/transformers/communityTransformer';
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
  const { toUserId, resourceId, communityId, imageUrls, message } =
    shoutoutData;

  return {
    message,
    from_user_id: fromUserId,
    to_user_id: toUserId,
    resource_id: resourceId,
    community_id: communityId,
    image_urls: imageUrls || [],
  };
}

/**
 * Transform a domain shoutout data object to a database shoutout update record
 */
export function toShoutoutUpdateRow(
  shoutoutData: Partial<ShoutoutInput>,
): ShoutoutUpdateRow {
  const { toUserId, resourceId, communityId, imageUrls, message } =
    shoutoutData;

  return {
    message,
    // Note: fromUserId cannot be updated via this method - it's set at creation
    from_user_id: undefined,
    to_user_id: toUserId,
    resource_id: resourceId,
    community_id: communityId,
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
  const fromUser = Array.isArray(dbShoutout.fromUser)
    ? dbShoutout.fromUser[0]
    : dbShoutout.fromUser;
  const toUser = Array.isArray(dbShoutout.toUser)
    ? dbShoutout.toUser[0]
    : dbShoutout.toUser;
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
  if (!resource) {
    throw new Error(`Shoutout ${dbShoutout.id} missing required resource data`);
  }
  if (!community) {
    throw new Error(`Shoutout ${dbShoutout.id} missing required community data`);
  }
  if (!resource.owner) {
    throw new Error(`Shoutout ${dbShoutout.id} resource missing required owner data`);
  }

  // Transform users to UserSummary
  const partialFromUser = fromUser
    ? {
        id: fromUser.id,
        firstName: fromUser.user_metadata?.first_name || '',
        avatarUrl: fromUser.user_metadata?.avatar_url,
        createdAt: new Date(fromUser.created_at),
        updatedAt: new Date(fromUser.updated_at),
      }
    : null;

  const partialToUser = toUser
    ? {
        id: toUser.id,
        firstName: toUser.user_metadata?.first_name || '',
        avatarUrl: toUser.user_metadata?.avatar_url,
        createdAt: new Date(toUser.created_at),
        updatedAt: new Date(toUser.updated_at),
      }
    : null;

  // Transform resource to ResourceSummary
  const resourceSummary = resource
    ? {
        id: resource.id,
        type: resource.type as 'offer' | 'request',
        category: resource.category,
        title: resource.title,
        ownerId: resource.owner_id,
        owner: {
          id: resource.owner.id,
          firstName: resource.owner.user_metadata?.first_name || '',
          avatarUrl: resource.owner.user_metadata?.avatar_url,
          createdAt: new Date(resource.owner.created_at),
          updatedAt: new Date(resource.owner.updated_at),
        },
        imageUrls: resource.image_urls || [],
        createdAt: new Date(resource.created_at),
        updatedAt: new Date(resource.updated_at),
      }
    : null;

  return {
    id: dbShoutout.id,
    message: dbShoutout.message,
    imageUrls: dbShoutout.image_urls || [],
    createdAt: new Date(dbShoutout.created_at),
    updatedAt: new Date(dbShoutout.updated_at),
    fromUserId: dbShoutout.from_user_id,
    fromUser: partialFromUser!,
    toUserId: dbShoutout.to_user_id,
    toUser: partialToUser!,
    resourceId: dbShoutout.resource_id,
    resource: resourceSummary!,
    communityId: dbShoutout.community_id,
    community: toDomainCommunitySummary(community),
  };
}
