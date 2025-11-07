import type { NotificationDetail } from '../types/notificationDetail';
import type { ClaimDetails } from '../types/claimDetails';
import type { NotificationDetailsRow } from '../types/notificationDetailsRow';
import { ACTION_TYPES, type ActionType } from '../constants';
import { getTypedMetadata } from '../types/notificationMetadata';

function parseClaimDetails(
  claimDetailsJson: unknown,
): ClaimDetails | undefined {
  if (!claimDetailsJson || typeof claimDetailsJson !== 'object') {
    return undefined;
  }

  const details = claimDetailsJson as Record<string, unknown>;

  // Required fields check
  if (
    !details.resource_id ||
    !details.status ||
    !details.resource_title ||
    !details.resource_type ||
    !details.claimant_name ||
    !details.owner_name
  ) {
    return undefined;
  }

  return {
    resourceId: details.resource_id as string,
    timeslotId: (details.timeslot_id as string) || undefined,
    timeslotStartTime: details.timeslot_start_time
      ? new Date(details.timeslot_start_time as string)
      : undefined,
    timeslotEndTime: details.timeslot_end_time
      ? new Date(details.timeslot_end_time as string)
      : undefined,
    status: details.status as ClaimDetails['status'],
    commitmentLevel: (details.commitment_level as string) || undefined,
    resourceTitle: details.resource_title as string,
    resourceType: details.resource_type as ClaimDetails['resourceType'],
    claimantName: details.claimant_name as string,
    ownerName: details.owner_name as string,
  };
}

export function toDomainNotification(
  row: NotificationDetailsRow,
): NotificationDetail {
  const action = (row.action ||
    ACTION_TYPES.RESOURCE_CREATED) as ActionType;

  // Extract typed data from new columns
  const actor_data = (row.actor_data as Record<string, unknown>) || {};
  const resource_data = (row.resource_data as Record<string, unknown>) || {};
  const comment_data = (row.comment_data as Record<string, unknown>) || {};

  return {
    id: row.id || '',
    userId: row.user_id || '',
    action,

    // Polymorphic references from view
    resourceId: row.resource_id || undefined,
    commentId: row.comment_id || undefined,
    claimId: row.claim_id || undefined,
    communityId: row.community_id || undefined,
    shoutoutId: row.shoutout_id || undefined,
    conversationId: row.conversation_id || undefined,

    // Actor information (from actor_data)
    actorId: row.actor_id || undefined,
    actorName: (actor_data.display_name as string) || undefined,
    actorAvatar: (actor_data.avatar_url as string) || undefined,

    // Resource information (from resource_data)
    resourceTitle: (resource_data.title as string) || undefined,
    resourceType: (resource_data.type as 'offer' | 'request' | 'event') || undefined,

    // Comment information (from comment_data)
    commentContent: (comment_data.content_preview as string) || undefined,

    // Claim information (from claim_data)
    claimDetails: parseClaimDetails(row.claim_data),

    // Community information (denormalized from communities table)
    communityName: row.community_name || undefined,

    // Shoutout information (denormalized from shoutouts table)
    shoutoutMessage: row.shoutout_message || undefined,

    // Typed metadata based on action (build from typed columns)
    metadata: getTypedMetadata(action, {
      changes: row.changes,
      ...actor_data,
      ...resource_data,
      ...comment_data,
    }),

    // Status
    readAt: row.read_at ? new Date(row.read_at) : null,

    // Timestamps
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
  };
}
