import { ACTION_TYPES, type ActionType } from '../constants';

// Specific metadata interfaces for each action type

export interface ClaimResponseMetadata {
  response: 'approved' | 'rejected';
}

export interface ResourceUpdatedMetadata {
  changes: string[];
}

export interface EventMetadata {
  changes?: string[];
  timeslot_start_time?: string;
  timeslot_end_time?: string;
  resource_status: string;
  voting_deadline?: string;
}

export interface TrustLevelMetadata {
  old_level: number;
  new_level: number;
}

// Helper function to check if action has metadata
export function hasMetadata(action: ActionType): boolean {
  return (
    action === ACTION_TYPES.CLAIM_APPROVED ||
    action === ACTION_TYPES.CLAIM_REJECTED ||
    action === ACTION_TYPES.MEMBER_JOINED ||
    action === ACTION_TYPES.MEMBER_LEFT ||
    action === ACTION_TYPES.RESOURCE_UPDATED ||
    action === ACTION_TYPES.EVENT_UPDATED ||
    action === ACTION_TYPES.EVENT_CREATED ||
    action === ACTION_TYPES.EVENT_CANCELLED ||
    action === ACTION_TYPES.EVENT_STARTING ||
    action === ACTION_TYPES.TRUSTLEVEL_CHANGED
  );
}

// Helper function to get typed metadata for any notification action
export function getTypedMetadata(
  action: ActionType,
  metadata: Record<string, unknown>,
):
  | ClaimResponseMetadata
  | ResourceUpdatedMetadata
  | EventMetadata
  | TrustLevelMetadata
  | Record<string, never> {
  switch (action) {
    case ACTION_TYPES.CLAIM_APPROVED:
    case ACTION_TYPES.CLAIM_REJECTED:
      return {
        response:
          metadata.response === 'approved' || metadata.response === 'rejected'
            ? metadata.response
            : action === ACTION_TYPES.CLAIM_APPROVED
              ? 'approved'
              : 'rejected',
      };

    case ACTION_TYPES.RESOURCE_UPDATED:
      return {
        changes:
          Array.isArray(metadata.changes) &&
          metadata.changes.every((c) => typeof c === 'string')
            ? (metadata.changes as string[])
            : [],
      };

    case ACTION_TYPES.EVENT_CREATED:
    case ACTION_TYPES.EVENT_CANCELLED:
    case ACTION_TYPES.EVENT_STARTING:
      return {
        timeslot_start_time:
          typeof metadata.timeslot_start_time === 'string'
            ? metadata.timeslot_start_time
            : undefined,
        timeslot_end_time:
          typeof metadata.timeslot_end_time === 'string'
            ? metadata.timeslot_end_time
            : undefined,
        resource_status:
          typeof metadata.resource_status === 'string'
            ? metadata.resource_status
            : 'unknown',
        voting_deadline:
          typeof metadata.voting_deadline === 'string'
            ? metadata.voting_deadline
            : undefined,
      };

    case ACTION_TYPES.EVENT_UPDATED:
      return {
        changes:
          Array.isArray(metadata.changes) &&
          metadata.changes.every((c) => typeof c === 'string')
            ? (metadata.changes as string[])
            : [],
        timeslot_start_time:
          typeof metadata.timeslot_start_time === 'string'
            ? metadata.timeslot_start_time
            : undefined,
        timeslot_end_time:
          typeof metadata.timeslot_end_time === 'string'
            ? metadata.timeslot_end_time
            : undefined,
        resource_status:
          typeof metadata.resource_status === 'string'
            ? metadata.resource_status
            : 'unknown',
        voting_deadline:
          typeof metadata.voting_deadline === 'string'
            ? metadata.voting_deadline
            : undefined,
      };

    case ACTION_TYPES.TRUSTLEVEL_CHANGED:
      return {
        old_level:
          typeof metadata.old_level === 'number' ? metadata.old_level : 0,
        new_level:
          typeof metadata.new_level === 'number' ? metadata.new_level : 0,
      };

    default:
      return {};
  }
}
