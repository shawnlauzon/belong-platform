import { describe, it, expect } from "vitest";
import { toShoutoutInfo } from "../transformers/shoutoutsTransformer";
import { createMockDbShoutout } from "../../test-utils";

describe("ShoutoutInfo Transformer", () => {
  it("should transform database shoutout to ShoutoutInfo without snake_case properties", () => {
    // Arrange
    const dbShoutout = createMockDbShoutout({
      id: "shoutout-123",
      message: "Shoutout so much!",
      from_user_id: "user-123",
      to_user_id: "user-456",
      resource_id: "resource-789",
      image_urls: ["shoutout1.jpg", "shoutout2.jpg"],
      impact_description: "This really helped me fix my bike",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-02T00:00:00Z",
    });

    // Act
    const result = toShoutoutInfo(
      dbShoutout,
      "user-123",
      "user-456",
      "resource-789",
      "community-123",
    );

    // Assert - Should have camelCase properties
    expect(result).toHaveProperty("id", "shoutout-123");
    expect(result).toHaveProperty("message", "Shoutout so much!");
    expect(result).toHaveProperty("fromUserId", "user-123");
    expect(result).toHaveProperty("toUserId", "user-456");
    expect(result).toHaveProperty("resourceId", "resource-789");
    expect(result).toHaveProperty("communityId", "community-123");
    expect(result).toHaveProperty("imageUrls", ["shoutout1.jpg", "shoutout2.jpg"]);
    expect(result).toHaveProperty(
      "impactDescription",
      "This really helped me fix my bike",
    );
    expect(result).toHaveProperty("createdAt");
    expect(result).toHaveProperty("updatedAt");

    // Assert - Should NOT have snake_case properties
    expect(result).not.toHaveProperty("from_user_id");
    expect(result).not.toHaveProperty("to_user_id");
    expect(result).not.toHaveProperty("resource_id");
    expect(result).not.toHaveProperty("image_urls");
    expect(result).not.toHaveProperty("impact_description");
    expect(result).not.toHaveProperty("created_at");
    expect(result).not.toHaveProperty("updated_at");

    // Assert - Should not have nested objects
    expect(result).not.toHaveProperty("fromUser");
    expect(result).not.toHaveProperty("toUser");
    expect(result).not.toHaveProperty("resource");
  });

  it("should handle optional fields correctly in ShoutoutInfo", () => {
    // Arrange
    const dbShoutout = createMockDbShoutout({
      id: "shoutout-456",
      message: "Simple shoutout",
      from_user_id: "user-456",
      to_user_id: "user-789",
      resource_id: "resource-123",
      image_urls: null,
      impact_description: null,
    });

    // Act
    const result = toShoutoutInfo(
      dbShoutout,
      "user-456",
      "user-789",
      "resource-123",
      "community-456",
    );

    // Assert
    expect(result.message).toBe("Simple shoutout");
    expect(result.imageUrls).toEqual([]);
    expect(result.impactDescription).toBeUndefined();
    expect(result.fromUserId).toBe("user-456");
    expect(result.toUserId).toBe("user-789");
    expect(result.resourceId).toBe("resource-123");
    expect(result.communityId).toBe("community-456");

    // Verify no snake_case leakage
    expect(result).not.toHaveProperty("image_urls");
    expect(result).not.toHaveProperty("impact_description");
    expect(result).not.toHaveProperty("from_user_id");
    expect(result).not.toHaveProperty("to_user_id");
    expect(result).not.toHaveProperty("resource_id");
  });
});
