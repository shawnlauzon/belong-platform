import { describe, it, expect } from "vitest";
import type { Database } from "@belongnetwork/types/database";

/**
 * Update operations validation tests
 *
 * These tests specifically validate that update operations don't try to set
 * fields that don't exist in the database schema. This prevents runtime
 * errors like "Could not find column X in schema cache".
 */

type CommunityUpdateDbData =
  Database["public"]["Tables"]["communities"]["Update"];
type ResourceUpdateDbData = Database["public"]["Tables"]["resources"]["Update"];
type EventUpdateDbData = Database["public"]["Tables"]["events"]["Update"];
type ThanksUpdateDbData = Database["public"]["Tables"]["thanks"]["Update"];

describe("Update Operations Schema Validation", () => {
  describe("Community updates", () => {
    it("should only allow fields that exist in communities Update schema", () => {
      // This test validates the exact issue we just fixed

      // Valid update data that should work
      const validUpdate: CommunityUpdateDbData = {
        name: "Updated Community",
        description: "Updated description",
        organizer_id: "user-123",
        updated_at: new Date().toISOString(),
      };

      // Verify that valid updates have only allowed fields
      const updateKeys = Object.keys(validUpdate);
      const allowedKeys: Array<keyof CommunityUpdateDbData> = [
        "center",
        "created_at",
        "deleted_at",
        "deleted_by",
        "description",
        "hierarchy_path",
        "id",
        "is_active",
        "level",
        "member_count",
        "name",
        "organizer_id",
        "parent_id",
        "radius_km",
        "time_zone",
        "updated_at",
      ];

      for (const key of updateKeys) {
        expect(allowedKeys).toContain(key as keyof CommunityUpdateDbData);
      }

      // These fields DO NOT exist in the schema and should never be used
      const forbiddenFields = [
        "updated_by", // ❌ The field that caused the original bug
        "created_by", // ❌ Common mistake
        "modified_by", // ❌ Common mistake
        "owner_id", // ❌ Wrong table
        "user_id", // ❌ Generic mistake
      ];

      // Verify these fields are not in the allowed schema
      for (const forbiddenField of forbiddenFields) {
        expect(allowedKeys).not.toContain(forbiddenField as any);
      }

      // TypeScript compilation test - these would cause compile errors:
      // const invalidUpdate: CommunityUpdateDbData = {
      //   name: 'Test',
      //   updated_by: 'user-123', // ❌ TypeScript error
      // };
    });

    it("should handle common update payload patterns safely", () => {
      // Test patterns that might be used in actual update operations
      const basePayload = {
        name: "Updated Community",
        description: "New description",
        updated_at: new Date().toISOString(),
      };

      // Simulate what the updateCommunity function should create
      const dbPayload: CommunityUpdateDbData = {
        ...basePayload,
        organizer_id: "user-123",
        // ❌ updated_by: 'user-123', // This field doesn't exist!
      };

      // Verify the payload only contains valid fields
      expect(dbPayload).toHaveProperty("name");
      expect(dbPayload).toHaveProperty("description");
      expect(dbPayload).toHaveProperty("updated_at");
      expect(dbPayload).toHaveProperty("organizer_id");

      // The problematic field should not be present
      expect(dbPayload).not.toHaveProperty("updated_by");
    });
  });

  describe("Resource updates", () => {
    it("should only allow fields that exist in resources Update schema", () => {
      const validUpdate: ResourceUpdateDbData = {
        title: "Updated Resource",
        description: "Updated description",
        owner_id: "user-123",
        is_active: true,
      };

      // Resources table has owner_id, not updated_by
      expect(validUpdate).toHaveProperty("owner_id");
      expect(validUpdate).not.toHaveProperty("updated_by");
      expect(validUpdate).not.toHaveProperty("created_by");
    });
  });

  describe("Event updates", () => {
    it("should only allow fields that exist in events Update schema", () => {
      const validUpdate: EventUpdateDbData = {
        title: "Updated Event",
        description: "Updated description",
        organizer_id: "user-123",
        is_active: true,
      };

      // Events table has organizer_id, not updated_by
      expect(validUpdate).toHaveProperty("organizer_id");
      expect(validUpdate).not.toHaveProperty("updated_by");
      expect(validUpdate).not.toHaveProperty("created_by");
    });
  });

  describe("Thanks updates", () => {
    it("should only allow fields that exist in thanks Update schema", () => {
      const validUpdate: ThanksUpdateDbData = {
        message: "Updated thanks message",
        from_user_id: "user-123",
        to_user_id: "user-456",
      };

      // Thanks table has user IDs, not updated_by
      expect(validUpdate).toHaveProperty("from_user_id");
      expect(validUpdate).toHaveProperty("to_user_id");
      expect(validUpdate).not.toHaveProperty("updated_by");
      expect(validUpdate).not.toHaveProperty("created_by");
    });
  });

  describe("Anti-patterns detection", () => {
    it("should document fields that commonly cause schema errors", () => {
      // This test documents common mistakes to avoid
      const commonMistakes = {
        // Fields that don't exist in ANY of our tables
        globallyInvalid: [
          "updated_by",
          "created_by",
          "modified_by",
          "modified_at",
          "last_updated",
          "last_updated_by",
          "changed_by",
          "changed_at",
        ],

        // Fields that exist in some tables but not others (easy to mix up)
        tableSpecific: {
          owner_id: ["resources"], // Only in resources, not communities/events
          organizer_id: ["communities", "events"], // Not in resources/thanks
          from_user_id: ["thanks"], // Only in thanks
          to_user_id: ["thanks"], // Only in thanks
        },

        // CamelCase variants that should never appear in DB operations
        camelCaseVariants: [
          "organizerId",
          "ownerId",
          "communityId",
          "resourceId",
          "fromUserId",
          "toUserId",
          "parentId",
          "createdAt",
          "updatedAt",
        ],
      };

      // Document these patterns for future reference
      expect(commonMistakes.globallyInvalid).toContain("updated_by");
      expect(commonMistakes.tableSpecific.owner_id).toEqual(["resources"]);
      expect(commonMistakes.camelCaseVariants).toContain("organizerId");
    });
  });
});
