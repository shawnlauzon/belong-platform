import { describe, it, expect } from "vitest";
import {
  parseChannelPreferences,
  isChannelEnabled,
  getChannelPreferences,
  toTypedPreferences,
  type TypedNotificationPreferences,
  type NotificationPreferences,
} from "../notificationPreferences";

describe("parseChannelPreferences", () => {
  it("should parse valid JSONB preferences", () => {
    const result = parseChannelPreferences({
      in_app: true,
      push: false,
      email: true,
    });

    expect(result).toEqual({
      in_app: true,
      push: false,
      email: true,
    });
  });

  it("should return defaults for null/undefined", () => {
    const result = parseChannelPreferences(null);

    expect(result).toEqual({
      in_app: true,
      push: true,
      email: true,
    });
  });

  it("should return defaults for invalid objects", () => {
    const result = parseChannelPreferences({ invalid: "data" });

    expect(result).toEqual({
      in_app: false,
      push: false,
      email: false,
    });
  });

  it("should handle partial objects", () => {
    const result = parseChannelPreferences({
      in_app: true,
    });

    expect(result).toEqual({
      in_app: true,
      push: false,
      email: false,
    });
  });
});

describe("isChannelEnabled", () => {
  const mockPreferences: TypedNotificationPreferences = {
    id: "test-id",
    user_id: "test-user",
    notifications_enabled: true,
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
    "comment.replied": { in_app: true, push: true, email: false },
    "claim.created": { in_app: true, push: false, email: false },
    "resource.created": { in_app: true, push: true, email: true },
    "event.created": { in_app: true, push: true, email: false },
    "resource.updated": { in_app: true, push: true, email: false },
    "resource.commented": { in_app: true, push: true, email: false },
    "claim.cancelled": { in_app: true, push: true, email: false },
    "claim.responded": { in_app: true, push: true, email: false },
    "resource.given": { in_app: true, push: true, email: false },
    "resource.received": { in_app: true, push: true, email: false },
    "event.updated": { in_app: true, push: true, email: false },
    "event.cancelled": { in_app: true, push: true, email: false },
    "resource.expiring": { in_app: true, push: true, email: false },
    "event.starting": { in_app: true, push: true, email: false },
    "membership.updated": { in_app: true, push: true, email: false },
    "message.received": { in_app: true, push: true, email: false },
    "shoutout.received": { in_app: true, push: true, email: false },
  };

  it("should return true when channel is enabled", () => {
    const result = isChannelEnabled(
      mockPreferences,
      "comment.replied",
      "push"
    );
    expect(result).toBe(true);
  });

  it("should return false when channel is disabled", () => {
    const result = isChannelEnabled(mockPreferences, "claim.created", "push");
    expect(result).toBe(false);
  });

  it("should return false when notifications are globally disabled", () => {
    const prefsWithNotificationsDisabled = {
      ...mockPreferences,
      notifications_enabled: false,
    };

    const result = isChannelEnabled(
      prefsWithNotificationsDisabled,
      "comment.replied",
      "push"
    );
    expect(result).toBe(false);
  });

  it("should return false for any channel when notifications are globally disabled", () => {
    const prefsWithNotificationsDisabled = {
      ...mockPreferences,
      notifications_enabled: false,
    };

    const result = isChannelEnabled(
      prefsWithNotificationsDisabled,
      "resource.created",
      "email"
    );
    expect(result).toBe(false);
  });
});

describe("getChannelPreferences", () => {
  const mockPreferences: TypedNotificationPreferences = {
    id: "test-id",
    user_id: "test-user",
    notifications_enabled: true,
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
    "comment.replied": { in_app: true, push: true, email: false },
    "claim.created": { in_app: true, push: false, email: false },
    "resource.created": { in_app: true, push: true, email: true },
    "event.created": { in_app: true, push: true, email: false },
    "resource.updated": { in_app: true, push: true, email: false },
    "resource.commented": { in_app: true, push: true, email: false },
    "claim.cancelled": { in_app: true, push: true, email: false },
    "claim.responded": { in_app: true, push: true, email: false },
    "resource.given": { in_app: true, push: true, email: false },
    "resource.received": { in_app: true, push: true, email: false },
    "event.updated": { in_app: true, push: true, email: false },
    "event.cancelled": { in_app: true, push: true, email: false },
    "resource.expiring": { in_app: true, push: true, email: false },
    "event.starting": { in_app: true, push: true, email: false },
    "membership.updated": { in_app: true, push: true, email: false },
    "message.received": { in_app: true, push: true, email: false },
    "shoutout.received": { in_app: true, push: true, email: false },
  };

  it("should return channel preferences for a notification type", () => {
    const result = getChannelPreferences(mockPreferences, "comment.replied");
    expect(result).toEqual({ in_app: true, push: true, email: false });
  });

  it("should return correct preferences for different types", () => {
    const result = getChannelPreferences(mockPreferences, "claim.created");
    expect(result).toEqual({ in_app: true, push: false, email: false });
  });
});

describe("toTypedPreferences", () => {
  it("should convert database row to typed preferences", () => {
    const dbRow: NotificationPreferences = {
      id: "test-id",
      user_id: "test-user",
      notifications_enabled: true,
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
      comment_replied: { in_app: true, push: true, email: false },
      claim_created: { in_app: true, push: false, email: false },
      resource_created: { in_app: true, push: true, email: true },
      event_created: { in_app: true, push: true, email: false },
      resource_updated: { in_app: true, push: true, email: false },
      resource_commented: { in_app: true, push: true, email: false },
      claim_cancelled: { in_app: true, push: true, email: false },
      claim_responded: { in_app: true, push: true, email: false },
      resource_given: { in_app: true, push: true, email: false },
      resource_received: { in_app: true, push: true, email: false },
      event_updated: { in_app: true, push: true, email: false },
      event_cancelled: { in_app: true, push: true, email: false },
      resource_expiring: { in_app: true, push: true, email: false },
      event_starting: { in_app: true, push: true, email: false },
      membership_updated: { in_app: true, push: true, email: false },
      message_received: { in_app: true, push: true, email: false },
      shoutout_received: { in_app: true, push: true, email: false },
      connection_accepted: { in_app: true, push: true, email: false },
      trustlevel_changed: { in_app: true, push: true, email: false },
    };

    const result = toTypedPreferences(dbRow);

    expect(result.id).toBe("test-id");
    expect(result.user_id).toBe("test-user");
    expect(result.notifications_enabled).toBe(true);
    expect(result["comment.replied"]).toEqual({
      in_app: true,
      push: true,
      email: false,
    });
    expect(result["claim.created"]).toEqual({
      in_app: true,
      push: false,
      email: false,
    });
  });
});
