import { describe, it, expect } from "vitest";
import { getTypedMetadata, hasMetadata } from "../notificationMetadata";
import { ACTION_TYPES } from "../../constants";

describe("hasMetadata", () => {
  it("should return true for actions with metadata", () => {
    expect(hasMetadata(ACTION_TYPES.CLAIM_APPROVED)).toBe(true);
    expect(hasMetadata(ACTION_TYPES.CLAIM_REJECTED)).toBe(true);
    expect(hasMetadata(ACTION_TYPES.RESOURCE_UPDATED)).toBe(true);
    expect(hasMetadata(ACTION_TYPES.EVENT_UPDATED)).toBe(true);
    expect(hasMetadata(ACTION_TYPES.EVENT_CREATED)).toBe(true);
    expect(hasMetadata(ACTION_TYPES.EVENT_CANCELLED)).toBe(true);
    expect(hasMetadata(ACTION_TYPES.EVENT_STARTING)).toBe(true);
    expect(hasMetadata(ACTION_TYPES.TRUSTLEVEL_CHANGED)).toBe(true);
  });

  it("should return false for actions without metadata", () => {
    expect(hasMetadata(ACTION_TYPES.COMMENT_REPLIED)).toBe(false);
    expect(hasMetadata(ACTION_TYPES.CLAIM_CREATED)).toBe(false);
    expect(hasMetadata(ACTION_TYPES.MESSAGE_RECEIVED)).toBe(false);
    expect(hasMetadata(ACTION_TYPES.RESOURCE_CREATED)).toBe(false);
    expect(hasMetadata(ACTION_TYPES.MEMBER_JOINED)).toBe(false);
    expect(hasMetadata(ACTION_TYPES.MEMBER_LEFT)).toBe(false);
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
    it("should return empty object for MEMBER_JOINED (action field contains the info)", () => {
      const result = getTypedMetadata(ACTION_TYPES.MEMBER_JOINED, {
        action: "joined",
      });

      // No metadata needed - the notification's action field already tells us it's member.joined
      expect(result).toEqual({});
    });

    it("should return empty object for MEMBER_LEFT (action field contains the info)", () => {
      const result = getTypedMetadata(ACTION_TYPES.MEMBER_LEFT, {
        action: "left",
      });

      // No metadata needed - the notification's action field already tells us it's member.left
      expect(result).toEqual({});
    });
  });

  describe("RESOURCE_UPDATED and EVENT_UPDATED", () => {
    it("should parse resource updated metadata with changes", () => {
      const result = getTypedMetadata(ACTION_TYPES.RESOURCE_UPDATED, {
        changes: ["title", "description"],
      });

      expect(result).toEqual({
        changes: ["title", "description"],
      });
    });


    it("should filter out non-string changes", () => {
      const result = getTypedMetadata(ACTION_TYPES.RESOURCE_UPDATED, {
        changes: ["title", 123, "description", null],
      });

      expect(result).toEqual({
        changes: [],
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

  describe("Event actions (EVENT_CREATED, EVENT_UPDATED, EVENT_CANCELLED, EVENT_STARTING)", () => {
    it("should parse event metadata with all fields", () => {
      const result = getTypedMetadata(ACTION_TYPES.EVENT_CREATED, {
        timeslot_start_time: "2025-01-01T10:00:00Z",
        timeslot_end_time: "2025-01-01T12:00:00Z",
        resource_status: "active",
        voting_deadline: "2024-12-31T23:59:59Z",
      });

      expect(result).toEqual({
        timeslot_start_time: "2025-01-01T10:00:00Z",
        timeslot_end_time: "2025-01-01T12:00:00Z",
        resource_status: "active",
        voting_deadline: "2024-12-31T23:59:59Z",
      });
    });

    it("should handle EVENT_UPDATED with changes", () => {
      const result = getTypedMetadata(ACTION_TYPES.EVENT_UPDATED, {
        changes: ["title", "resource_status"],
        resource_status: "cancelled",
      });

      expect(result).toEqual({
        changes: ["title", "resource_status"],
        timeslot_start_time: undefined,
        timeslot_end_time: undefined,
        resource_status: "cancelled",
        voting_deadline: undefined,
      });
    });

    it("should default resource_status to unknown if missing", () => {
      const result = getTypedMetadata(ACTION_TYPES.EVENT_CANCELLED, {});

      expect(result).toEqual({
        timeslot_start_time: undefined,
        timeslot_end_time: undefined,
        resource_status: "unknown",
        voting_deadline: undefined,
      });
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

    it("should return empty object for resource created", () => {
      const result = getTypedMetadata(ACTION_TYPES.RESOURCE_CREATED, {});

      expect(result).toEqual({});
    });
  });
});
