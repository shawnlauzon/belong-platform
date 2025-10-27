import { describe, it, expect } from "vitest";
import { getTypedMetadata, hasMetadata } from "../notificationMetadata";
import { NOTIFICATION_TYPES } from "../../constants";

describe("hasMetadata", () => {
  it("should return true for notification types with metadata", () => {
    expect(hasMetadata(NOTIFICATION_TYPES.CLAIM_RESPONDED)).toBe(true);
    expect(hasMetadata(NOTIFICATION_TYPES.MEMBERSHIP_UPDATED)).toBe(true);
    expect(hasMetadata(NOTIFICATION_TYPES.RESOURCE_UPDATED)).toBe(true);
    expect(hasMetadata(NOTIFICATION_TYPES.EVENT_UPDATED)).toBe(true);
    expect(hasMetadata(NOTIFICATION_TYPES.TRUST_LEVEL_CHANGED)).toBe(true);
    expect(hasMetadata(NOTIFICATION_TYPES.RESOURCE_CREATED)).toBe(true);
    expect(hasMetadata(NOTIFICATION_TYPES.EVENT_CREATED)).toBe(true);
  });

  it("should return false for notification types without metadata", () => {
    expect(hasMetadata(NOTIFICATION_TYPES.COMMENT_REPLIED)).toBe(false);
    expect(hasMetadata(NOTIFICATION_TYPES.CLAIM_CREATED)).toBe(false);
    expect(hasMetadata(NOTIFICATION_TYPES.MESSAGE_RECEIVED)).toBe(false);
  });
});

describe("getTypedMetadata", () => {
  describe("CLAIM_RESPONDED", () => {
    it("should parse approved response metadata", () => {
      const result = getTypedMetadata(NOTIFICATION_TYPES.CLAIM_RESPONDED, {
        response: "approved",
      });

      expect(result).toEqual({ response: "approved" });
    });

    it("should parse rejected response metadata", () => {
      const result = getTypedMetadata(NOTIFICATION_TYPES.CLAIM_RESPONDED, {
        response: "rejected",
      });

      expect(result).toEqual({ response: "rejected" });
    });

    it("should default to approved for invalid response", () => {
      const result = getTypedMetadata(NOTIFICATION_TYPES.CLAIM_RESPONDED, {
        response: "invalid",
      });

      expect(result).toEqual({ response: "approved" });
    });
  });

  describe("MEMBERSHIP_UPDATED", () => {
    it("should parse joined action metadata", () => {
      const result = getTypedMetadata(NOTIFICATION_TYPES.MEMBERSHIP_UPDATED, {
        action: "joined",
      });

      expect(result).toEqual({ action: "joined" });
    });

    it("should parse left action metadata", () => {
      const result = getTypedMetadata(NOTIFICATION_TYPES.MEMBERSHIP_UPDATED, {
        action: "left",
      });

      expect(result).toEqual({ action: "left" });
    });

    it("should default to joined for invalid action", () => {
      const result = getTypedMetadata(NOTIFICATION_TYPES.MEMBERSHIP_UPDATED, {
        action: "invalid",
      });

      expect(result).toEqual({ action: "joined" });
    });
  });

  describe("RESOURCE_UPDATED and EVENT_UPDATED", () => {
    it("should parse resource updated metadata with changes", () => {
      const result = getTypedMetadata(NOTIFICATION_TYPES.RESOURCE_UPDATED, {
        changes: ["title", "description"],
        resource_title: "Test Resource",
      });

      expect(result).toEqual({
        changes: ["title", "description"],
        resource_title: "Test Resource",
      });
    });

    it("should handle missing resource_title", () => {
      const result = getTypedMetadata(NOTIFICATION_TYPES.RESOURCE_UPDATED, {
        changes: ["status"],
      });

      expect(result).toEqual({
        changes: ["status"],
        resource_title: undefined,
      });
    });

    it("should default to empty array for invalid changes", () => {
      const result = getTypedMetadata(NOTIFICATION_TYPES.EVENT_UPDATED, {
        changes: "not an array",
      });

      expect(result).toEqual({
        changes: [],
        resource_title: undefined,
      });
    });

    it("should filter out non-string changes", () => {
      const result = getTypedMetadata(NOTIFICATION_TYPES.RESOURCE_UPDATED, {
        changes: ["title", 123, "description", null],
      });

      expect(result).toEqual({
        changes: [],
        resource_title: undefined,
      });
    });
  });

  describe("TRUST_LEVEL_CHANGED", () => {
    it("should parse trust level metadata", () => {
      const result = getTypedMetadata(NOTIFICATION_TYPES.TRUST_LEVEL_CHANGED, {
        old_level: 2,
        new_level: 3,
      });

      expect(result).toEqual({ old_level: 2, new_level: 3 });
    });

    it("should default to 0 for invalid levels", () => {
      const result = getTypedMetadata(NOTIFICATION_TYPES.TRUST_LEVEL_CHANGED, {
        old_level: "invalid",
        new_level: "invalid",
      });

      expect(result).toEqual({ old_level: 0, new_level: 0 });
    });
  });

  describe("RESOURCE_CREATED and EVENT_CREATED", () => {
    it("should parse resource title for resource created", () => {
      const result = getTypedMetadata(NOTIFICATION_TYPES.RESOURCE_CREATED, {
        resource_title: "New Resource",
      });

      expect(result).toEqual({ resource_title: "New Resource" });
    });

    it("should parse resource title for event created", () => {
      const result = getTypedMetadata(NOTIFICATION_TYPES.EVENT_CREATED, {
        resource_title: "New Event",
      });

      expect(result).toEqual({ resource_title: "New Event" });
    });

    it("should default to empty string for missing title", () => {
      const result = getTypedMetadata(NOTIFICATION_TYPES.RESOURCE_CREATED, {});

      expect(result).toEqual({ resource_title: "" });
    });
  });

  describe("Other notification types", () => {
    it("should return empty object for types without metadata", () => {
      const result = getTypedMetadata(NOTIFICATION_TYPES.COMMENT_REPLIED, {});

      expect(result).toEqual({});
    });

    it("should return empty object for claim created", () => {
      const result = getTypedMetadata(NOTIFICATION_TYPES.CLAIM_CREATED, {
        some: "data",
      });

      expect(result).toEqual({});
    });
  });
});
