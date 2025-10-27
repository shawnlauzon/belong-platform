import { describe, it, expect } from "vitest";
import { getTypedMetadata, hasMetadata } from "../notificationMetadata";
import { ACTION_TYPES } from "../../constants";

describe("hasMetadata", () => {
  it("should return true for actions with metadata", () => {
    expect(hasMetadata(ACTION_TYPES.CLAIM_APPROVED)).toBe(true);
    expect(hasMetadata(ACTION_TYPES.CLAIM_REJECTED)).toBe(true);
    expect(hasMetadata(ACTION_TYPES.MEMBER_JOINED)).toBe(true);
    expect(hasMetadata(ACTION_TYPES.MEMBER_LEFT)).toBe(true);
    expect(hasMetadata(ACTION_TYPES.RESOURCE_UPDATED)).toBe(true);
    expect(hasMetadata(ACTION_TYPES.EVENT_UPDATED)).toBe(true);
    expect(hasMetadata(ACTION_TYPES.TRUSTLEVEL_CHANGED)).toBe(true);
    expect(hasMetadata(ACTION_TYPES.RESOURCE_CREATED)).toBe(true);
    expect(hasMetadata(ACTION_TYPES.EVENT_CREATED)).toBe(true);
  });

  it("should return false for actions without metadata", () => {
    expect(hasMetadata(ACTION_TYPES.COMMENT_REPLIED)).toBe(false);
    expect(hasMetadata(ACTION_TYPES.CLAIM_CREATED)).toBe(false);
    expect(hasMetadata(ACTION_TYPES.MESSAGE_RECEIVED)).toBe(false);
  });
});

describe("getTypedMetadata", () => {
  describe("CLAIM_APPROVED and CLAIM_REJECTED", () => {
    it("should parse approved response metadata for CLAIM_APPROVED", () => {
      const result = getTypedMetadata(ACTION_TYPES.CLAIM_APPROVED, {
        response: "approved",
      });

      expect(result).toEqual({ response: "approved" });
    });

    it("should default to approved for CLAIM_APPROVED with invalid response", () => {
      const result = getTypedMetadata(ACTION_TYPES.CLAIM_APPROVED, {
        response: "invalid",
      });

      expect(result).toEqual({ response: "approved" });
    });

    it("should parse rejected response metadata for CLAIM_REJECTED", () => {
      const result = getTypedMetadata(ACTION_TYPES.CLAIM_REJECTED, {
        response: "rejected",
      });

      expect(result).toEqual({ response: "rejected" });
    });

    it("should default to rejected for CLAIM_REJECTED with invalid response", () => {
      const result = getTypedMetadata(ACTION_TYPES.CLAIM_REJECTED, {
        response: "invalid",
      });

      expect(result).toEqual({ response: "rejected" });
    });
  });

  describe("MEMBER_JOINED and MEMBER_LEFT", () => {
    it("should parse joined action metadata for MEMBER_JOINED", () => {
      const result = getTypedMetadata(ACTION_TYPES.MEMBER_JOINED, {
        action: "joined",
      });

      expect(result).toEqual({ action: "joined" });
    });

    it("should default to joined for MEMBER_JOINED with invalid action", () => {
      const result = getTypedMetadata(ACTION_TYPES.MEMBER_JOINED, {
        action: "invalid",
      });

      expect(result).toEqual({ action: "joined" });
    });

    it("should parse left action metadata for MEMBER_LEFT", () => {
      const result = getTypedMetadata(ACTION_TYPES.MEMBER_LEFT, {
        action: "left",
      });

      expect(result).toEqual({ action: "left" });
    });

    it("should default to left for MEMBER_LEFT with invalid action", () => {
      const result = getTypedMetadata(ACTION_TYPES.MEMBER_LEFT, {
        action: "invalid",
      });

      expect(result).toEqual({ action: "left" });
    });
  });

  describe("RESOURCE_UPDATED and EVENT_UPDATED", () => {
    it("should parse resource updated metadata with changes", () => {
      const result = getTypedMetadata(ACTION_TYPES.RESOURCE_UPDATED, {
        changes: ["title", "description"],
        resource_title: "Test Resource",
      });

      expect(result).toEqual({
        changes: ["title", "description"],
        resource_title: "Test Resource",
      });
    });

    it("should handle missing resource_title", () => {
      const result = getTypedMetadata(ACTION_TYPES.RESOURCE_UPDATED, {
        changes: ["status"],
      });

      expect(result).toEqual({
        changes: ["status"],
        resource_title: undefined,
      });
    });

    it("should default to empty array for invalid changes", () => {
      const result = getTypedMetadata(ACTION_TYPES.EVENT_UPDATED, {
        changes: "not an array",
      });

      expect(result).toEqual({
        changes: [],
        resource_title: undefined,
      });
    });

    it("should filter out non-string changes", () => {
      const result = getTypedMetadata(ACTION_TYPES.RESOURCE_UPDATED, {
        changes: ["title", 123, "description", null],
      });

      expect(result).toEqual({
        changes: [],
        resource_title: undefined,
      });
    });
  });

  describe("TRUSTLEVEL_CHANGED", () => {
    it("should parse trust level metadata", () => {
      const result = getTypedMetadata(ACTION_TYPES.TRUSTLEVEL_CHANGED, {
        old_level: 2,
        new_level: 3,
      });

      expect(result).toEqual({ old_level: 2, new_level: 3 });
    });

    it("should default to 0 for invalid levels", () => {
      const result = getTypedMetadata(ACTION_TYPES.TRUSTLEVEL_CHANGED, {
        old_level: "invalid",
        new_level: "invalid",
      });

      expect(result).toEqual({ old_level: 0, new_level: 0 });
    });
  });

  describe("RESOURCE_CREATED and EVENT_CREATED", () => {
    it("should parse resource title for resource created", () => {
      const result = getTypedMetadata(ACTION_TYPES.RESOURCE_CREATED, {
        resource_title: "New Resource",
      });

      expect(result).toEqual({ resource_title: "New Resource" });
    });

    it("should parse resource title for event created", () => {
      const result = getTypedMetadata(ACTION_TYPES.EVENT_CREATED, {
        resource_title: "New Event",
      });

      expect(result).toEqual({ resource_title: "New Event" });
    });

    it("should default to empty string for missing title", () => {
      const result = getTypedMetadata(ACTION_TYPES.RESOURCE_CREATED, {});

      expect(result).toEqual({ resource_title: "" });
    });
  });

  describe("Other actions", () => {
    it("should return empty object for actions without metadata", () => {
      const result = getTypedMetadata(ACTION_TYPES.COMMENT_REPLIED, {});

      expect(result).toEqual({});
    });

    it("should return empty object for claim created", () => {
      const result = getTypedMetadata(ACTION_TYPES.CLAIM_CREATED, {
        some: "data",
      });

      expect(result).toEqual({});
    });
  });
});
