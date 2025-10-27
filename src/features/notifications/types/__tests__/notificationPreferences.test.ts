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
      email: false,
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
    push_enabled: true,
    email_enabled: false,
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
    "conversation.requested": { in_app: true, push: true, email: false },
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

  it("should return false when push is globally disabled", () => {
    const prefsWithPushDisabled = {
      ...mockPreferences,
      push_enabled: false,
    };

    const result = isChannelEnabled(
      prefsWithPushDisabled,
      "comment.replied",
      "push"
    );
    expect(result).toBe(false);
  });

  it("should return false when email is globally disabled", () => {
    const result = isChannelEnabled(
      mockPreferences,
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
    push_enabled: true,
    email_enabled: false,
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
    "conversation.requested": { in_app: true, push: true, email: false },
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
      push_enabled: true,
      email_enabled: false,
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
      "conversation.requested": { in_app: true, push: true, email: false },
      "message.received": { in_app: true, push: true, email: false },
      "shoutout.received": { in_app: true, push: true, email: false },
    };

    const result = toTypedPreferences(dbRow);

    expect(result.id).toBe("test-id");
    expect(result.user_id).toBe("test-user");
    expect(result.push_enabled).toBe(true);
    expect(result.email_enabled).toBe(false);
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
