import { ACTION_TYPES, type ActionType } from "../constants";

// Specific metadata interfaces for each action type

export interface ClaimResponseMetadata {
  response: "approved" | "rejected";
}

export interface MembershipMetadata {
  action: "joined" | "left";
}

export interface ResourceUpdatedMetadata {
  changes: string[];
  resource_title?: string;
}

export interface TrustLevelMetadata {
  old_level: number;
  new_level: number;
}

export interface ResourceTitleMetadata {
  resource_title: string;
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
    action === ACTION_TYPES.TRUSTLEVEL_CHANGED ||
    action === ACTION_TYPES.RESOURCE_CREATED ||
    action === ACTION_TYPES.EVENT_CREATED
  );
}

// Helper function to get typed metadata for any notification action
export function getTypedMetadata(
  action: ActionType,
  metadata: Record<string, unknown>
):
  | ClaimResponseMetadata
  | MembershipMetadata
  | ResourceUpdatedMetadata
  | TrustLevelMetadata
  | ResourceTitleMetadata
  | Record<string, never> {
  switch (action) {
    case ACTION_TYPES.CLAIM_APPROVED:
    case ACTION_TYPES.CLAIM_REJECTED:
      return {
        response:
          metadata.response === "approved" ||
          metadata.response === "rejected"
            ? metadata.response
            : action === ACTION_TYPES.CLAIM_APPROVED ? "approved" : "rejected",
      };

    case ACTION_TYPES.MEMBER_JOINED:
    case ACTION_TYPES.MEMBER_LEFT:
      return {
        action:
          metadata.action === "joined" || metadata.action === "left"
            ? metadata.action
            : action === ACTION_TYPES.MEMBER_JOINED ? "joined" : "left",
      };

    case ACTION_TYPES.RESOURCE_UPDATED:
    case ACTION_TYPES.EVENT_UPDATED:
      return {
        changes:
          Array.isArray(metadata.changes) &&
          metadata.changes.every((c) => typeof c === "string")
            ? (metadata.changes as string[])
            : [],
        resource_title:
          typeof metadata.resource_title === "string"
            ? metadata.resource_title
            : undefined,
      };

    case ACTION_TYPES.TRUSTLEVEL_CHANGED:
      return {
        old_level:
          typeof metadata.old_level === "number" ? metadata.old_level : 0,
        new_level:
          typeof metadata.new_level === "number" ? metadata.new_level : 0,
      };

    case ACTION_TYPES.RESOURCE_CREATED:
    case ACTION_TYPES.EVENT_CREATED:
      return {
        resource_title:
          typeof metadata.resource_title === "string"
            ? metadata.resource_title
            : "",
      };

    default:
      return {};
  }
}
