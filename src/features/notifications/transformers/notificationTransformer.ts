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
  const rawMetadata = (row.metadata as Record<string, unknown>) || {};

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

    // Actor information (basic + denormalized)
    actorId: row.actor_id || undefined,
    actorName: row.actor_display_name || undefined,
    actorAvatar: row.actor_avatar_url || undefined,

    // Resource information (denormalized from resources table)
    resourceTitle: row.resource_title || undefined,
    resourceType: row.resource_type || undefined,

    // Comment information (denormalized from comments table)
    commentContent: row.comment_content || undefined,

    // Claim information (denormalized from resource_claims table)
    claimDetails: parseClaimDetails(row.claim_details),

    // Community information (denormalized from communities table)
    communityName: row.community_name || undefined,

    // Shoutout information (denormalized from shoutouts table)
    shoutoutMessage: row.shoutout_message || undefined,

    // Typed metadata based on action
    metadata: getTypedMetadata(action, rawMetadata),

    // Status
    readAt: row.read_at ? new Date(row.read_at) : null,

    // Timestamps
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
  };
}
