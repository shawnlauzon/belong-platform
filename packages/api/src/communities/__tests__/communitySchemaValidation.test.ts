import { describe, it, expect } from "vitest";
import type { Database } from "@belongnetwork/types/database";
import { forDbUpdate, forDbInsert } from "../transformers/communityTransformer";
import { createMockDbCommunity } from "../../test-utils";

type CommunityRow = Database["public"]["Tables"]["communities"]["Row"];
type CommunityInsertDbData =
  Database["public"]["Tables"]["communities"]["Insert"];
type CommunityUpdateDbData =
  Database["public"]["Tables"]["communities"]["Update"];

describe("Community Schema Validation Tests", () => {
  describe("forDbUpdate transformer schema compliance", () => {
    it("should only generate fields that exist in database schema", () => {
      // Arrange
      const updateData = {
        id: "test-community-123",
        name: "Updated Community",
        description: "Updated description",
        organizerId: "user-123",
        timeZone: "America/New_York",
      };

      // Act
      const dbUpdateData = forDbUpdate(updateData);

      // Assert - Check that all keys in the result exist in the Update schema
      const updateKeys = Object.keys(dbUpdateData) as Array<
        keyof CommunityUpdateDbData
      >;

      // These are the valid Update schema keys (from database.ts)
      const validUpdateKeys: Array<keyof CommunityUpdateDbData> = [
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
        expect(validUpdateKeys).toContain(key);
      }

      // Assert - Verify that non-existent fields are NOT generated
      expect(dbUpdateData).not.toHaveProperty("updated_by");
      expect(dbUpdateData).not.toHaveProperty("created_by");
      expect(dbUpdateData).not.toHaveProperty("modified_by");
      expect(dbUpdateData).not.toHaveProperty("owner_id");
    });

    it("should not include fields that do not exist in Row schema", () => {
      // Arrange
      const updateData = {
        id: "test-community-123",
        name: "Test Community",
        // These fields don't exist in the communities table
        updatedBy: "user-123", // This would be updated_by in snake_case
        createdBy: "user-123", // This would be created_by in snake_case
        ownerId: "user-123", // This would be owner_id in snake_case
      };

      // Act
      const dbUpdateData = forDbUpdate(updateData);

      // Assert - These non-existent fields should not appear in any form
      expect(dbUpdateData).not.toHaveProperty("updated_by");
      expect(dbUpdateData).not.toHaveProperty("updatedBy");
      expect(dbUpdateData).not.toHaveProperty("created_by");
      expect(dbUpdateData).not.toHaveProperty("createdBy");
      expect(dbUpdateData).not.toHaveProperty("owner_id");
      expect(dbUpdateData).not.toHaveProperty("ownerId");
    });
  });

  describe("forDbInsert transformer schema compliance", () => {
    it("should only generate fields that exist in Insert schema", () => {
      // Arrange
      const insertData = {
        name: "New Community",
        description: "A new community",
        organizerId: "user-123",
        hierarchyPath: [],
        parentId: null,
        timeZone: "America/New_York",
        radiusKm: 50,
        memberCount: 1,
      };

      // Act
      const dbInsertData = forDbInsert(insertData);

      // Assert - Check that all keys exist in Insert schema
      const insertKeys = Object.keys(dbInsertData) as Array<
        keyof CommunityInsertDbData
      >;

      const validInsertKeys: Array<keyof CommunityInsertDbData> = [
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

      for (const key of insertKeys) {
        expect(validInsertKeys).toContain(key);
      }

      // Assert - Verify that non-existent fields are NOT generated
      expect(dbInsertData).not.toHaveProperty("updated_by");
      expect(dbInsertData).not.toHaveProperty("created_by");
    });
  });

  describe("Database Row type completeness", () => {
    it("should have all expected core fields in Row schema", () => {
      // This test verifies that the Row type includes expected fields
      // and helps catch if important fields are missing from the schema

      const mockRow = createMockDbCommunity();

      // Core required fields that should always exist
      expect(mockRow).toHaveProperty("id");
      expect(mockRow).toHaveProperty("name");
      expect(mockRow).toHaveProperty("organizer_id");
      expect(mockRow).toHaveProperty("created_at");
      expect(mockRow).toHaveProperty("updated_at");
      expect(mockRow).toHaveProperty("is_active");

      // Fields that we know should NOT exist (would catch copy-paste errors)
      expect(mockRow).not.toHaveProperty("updated_by");
      expect(mockRow).not.toHaveProperty("created_by");
      expect(mockRow).not.toHaveProperty("owner_id");
    });
  });

  describe("Type safety validation", () => {
    it("should prevent assignment of non-existent fields at compile time", () => {
      // This test uses TypeScript's type system to catch schema mismatches
      // It will fail at compile time if we try to assign invalid fields

      const validUpdate: CommunityUpdateDbData = {
        name: "Updated Community",
        organizer_id: "user-123",
        updated_at: new Date().toISOString(),
      };

      expect(validUpdate).toBeDefined();

      // These would cause TypeScript compilation errors:
      // const invalidUpdate: CommunityUpdateDbData = {
      //   name: 'Updated Community',
      //   updated_by: 'user-123', // ❌ TypeScript error - property doesn't exist
      //   created_by: 'user-123',  // ❌ TypeScript error - property doesn't exist
      // };
    });
  });
});
