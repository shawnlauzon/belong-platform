import { NOTIFICATION_TYPES, type NotificationType } from "../constants";

// Specific metadata interfaces for each notification type

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

// Helper function to check if notification type has metadata
export function hasMetadata(type: NotificationType): boolean {
  return (
    type === NOTIFICATION_TYPES.CLAIM_RESPONDED ||
    type === NOTIFICATION_TYPES.MEMBERSHIP_UPDATED ||
    type === NOTIFICATION_TYPES.RESOURCE_UPDATED ||
    type === NOTIFICATION_TYPES.EVENT_UPDATED ||
    type === NOTIFICATION_TYPES.TRUST_LEVEL_CHANGED ||
    type === NOTIFICATION_TYPES.RESOURCE_CREATED ||
    type === NOTIFICATION_TYPES.EVENT_CREATED
  );
}

// Helper function to get typed metadata for any notification
export function getTypedMetadata(
  type: NotificationType,
  metadata: Record<string, unknown>
):
  | ClaimResponseMetadata
  | MembershipMetadata
  | ResourceUpdatedMetadata
  | TrustLevelMetadata
  | ResourceTitleMetadata
  | Record<string, never> {
  switch (type) {
    case NOTIFICATION_TYPES.CLAIM_RESPONDED:
      return {
        response:
          metadata.response === "approved" ||
          metadata.response === "rejected"
            ? metadata.response
            : "approved",
      };

    case NOTIFICATION_TYPES.MEMBERSHIP_UPDATED:
      return {
        action:
          metadata.action === "joined" || metadata.action === "left"
            ? metadata.action
            : "joined",
      };

    case NOTIFICATION_TYPES.RESOURCE_UPDATED:
    case NOTIFICATION_TYPES.EVENT_UPDATED:
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

    case NOTIFICATION_TYPES.TRUST_LEVEL_CHANGED:
      return {
        old_level:
          typeof metadata.old_level === "number" ? metadata.old_level : 0,
        new_level:
          typeof metadata.new_level === "number" ? metadata.new_level : 0,
      };

    case NOTIFICATION_TYPES.RESOURCE_CREATED:
    case NOTIFICATION_TYPES.EVENT_CREATED:
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
