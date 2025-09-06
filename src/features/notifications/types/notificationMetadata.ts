import type { NotificationType } from './notification';

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
  return [
    'comment',
    'comment_reply',
    'shoutout_received',
    'trust_points_changed',
    'trust_level_changed',
    'claimed_resource_updated',
  ].includes(type);
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
    case 'comment':
    case 'comment_reply':
      return {
        content_preview:
          typeof metadata.content_preview === 'string'
            ? metadata.content_preview
            : '',
      };

    case 'shoutout_received':
      return {
        content_preview:
          typeof metadata.content_preview === 'string'
            ? metadata.content_preview
            : '',
      };

    case 'trust_points_changed':
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

    case 'trust_level_changed':
      return {
        old_level:
          typeof metadata.old_level === 'number' ? metadata.old_level : 0,
        new_level:
          typeof metadata.new_level === 'number' ? metadata.new_level : 0,
      };

    case 'claimed_resource_updated':
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
