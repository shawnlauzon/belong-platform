import { NOTIFICATION_TYPES, type NotificationType } from '../constants';

// Specific metadata interfaces for each notification type

export interface CommentMetadata {
  content_preview: string;
}

export interface ShoutoutMetadata {
  content_preview: string;
}

export interface TrustPointsMetadata {
  amount: number;
  old_score?: number;
  new_score?: number;
  reason?: string;
}

export interface TrustLevelMetadata {
  old_level: number;
  new_level: number;
}

export interface ResourceUpdatedMetadata {
  changes: string[];
}

// Helper function to check if notification type has metadata
export function hasMetadata(type: NotificationType): boolean {
  return (
    type === NOTIFICATION_TYPES.COMMENT ||
    type === NOTIFICATION_TYPES.COMMENT_REPLY ||
    type === NOTIFICATION_TYPES.SHOUTOUT_RECEIVED ||
    type === NOTIFICATION_TYPES.TRUST_POINTS_GAINED ||
    type === NOTIFICATION_TYPES.TRUST_POINTS_LOST ||
    type === NOTIFICATION_TYPES.TRUST_LEVEL_CHANGED ||
    type === NOTIFICATION_TYPES.CLAIMED_RESOURCE_UPDATED
  );
}

// Helper function to get typed metadata for any notification
export function getTypedMetadata(
  type: NotificationType,
  metadata: Record<string, unknown>,
):
  | CommentMetadata
  | ShoutoutMetadata
  | TrustPointsMetadata
  | TrustLevelMetadata
  | ResourceUpdatedMetadata
  | Record<string, never> {
  switch (type) {
    case NOTIFICATION_TYPES.COMMENT:
    case NOTIFICATION_TYPES.COMMENT_REPLY:
      return {
        content_preview:
          typeof metadata.content_preview === 'string'
            ? metadata.content_preview
            : '',
      };

    case NOTIFICATION_TYPES.SHOUTOUT_RECEIVED:
      return {
        content_preview:
          typeof metadata.content_preview === 'string'
            ? metadata.content_preview
            : '',
      };

    case NOTIFICATION_TYPES.TRUST_POINTS_GAINED:
    case NOTIFICATION_TYPES.TRUST_POINTS_LOST:
      return {
        amount: typeof metadata.amount === 'number' ? metadata.amount : 0,
        old_score:
          typeof metadata.old_score === 'number'
            ? metadata.old_score
            : undefined,
        new_score:
          typeof metadata.new_score === 'number'
            ? metadata.new_score
            : undefined,
        reason:
          typeof metadata.reason === 'string' ? metadata.reason : undefined,
      };

    case NOTIFICATION_TYPES.TRUST_LEVEL_CHANGED:
      return {
        old_level:
          typeof metadata.old_level === 'number' ? metadata.old_level : 0,
        new_level:
          typeof metadata.new_level === 'number' ? metadata.new_level : 0,
      };

    case NOTIFICATION_TYPES.CLAIMED_RESOURCE_UPDATED:
      return {
        changes:
          Array.isArray(metadata.changes) &&
          metadata.changes.every((c) => typeof c === 'string')
            ? (metadata.changes as string[])
            : [],
      };

    default:
      return {};
  }
}
