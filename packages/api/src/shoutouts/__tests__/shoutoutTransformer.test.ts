import { describe, it, expect } from "vitest";
import { faker } from "@faker-js/faker";
import {
  toDomainShoutout,
  forDbInsert,
  forDbUpdate,
} from "../transformers/shoutoutsTransformer";
import { createMockDbShoutout, createMockShoutoutData } from "./test-utils";
import { createMockUser, createMockResource } from "../../test-utils/mocks";

describe("Shoutout Transformer", () => {
  describe("toDomainShoutout", () => {
    it("should transform a database shoutout to a domain shoutout", () => {
      const mockFromUser = createMockUser();
      const mockToUser = createMockUser();
      const mockResource = createMockResource();
      const dbShoutout = createMockDbShoutout({
        from_user_id: mockFromUser.id,
        to_user_id: mockToUser.id,
        resource_id: mockResource.id,
      });

      const shoutout = toDomainShoutout(dbShoutout, {
        fromUser: mockFromUser,
        toUser: mockToUser,
        resource: mockResource,
      });

      expect(shoutout).toMatchObject({
        id: dbShoutout.id,
        message: dbShoutout.message,
        imageUrls: dbShoutout.image_urls,
        impactDescription: dbShoutout.impact_description || undefined,
        fromUser: mockFromUser,
        toUser: mockToUser,
        resource: mockResource,
      });
      expect(shoutout.createdAt).toBeInstanceOf(Date);
      expect(shoutout.updatedAt).toBeInstanceOf(Date);
    });

    it("should include users and resource if provided", () => {
      const mockFromUser = createMockUser();
      const mockToUser = createMockUser();
      const mockResource = createMockResource();
      const dbShoutout = createMockDbShoutout({
        from_user_id: mockFromUser.id,
        to_user_id: mockToUser.id,
        resource_id: mockResource.id,
      });

      const shoutout = toDomainShoutout(dbShoutout, {
        fromUser: mockFromUser,
        toUser: mockToUser,
        resource: mockResource,
      });

      expect(shoutout.fromUser).toEqual(mockFromUser);
      expect(shoutout.toUser).toEqual(mockToUser);
      expect(shoutout.resource).toEqual(mockResource);
    });

    it("should handle null impact_description", () => {
      const mockFromUser = createMockUser();
      const mockToUser = createMockUser();
      const mockResource = createMockResource();
      const dbShoutout = createMockDbShoutout({
        from_user_id: mockFromUser.id,
        to_user_id: mockToUser.id,
        resource_id: mockResource.id,
        impact_description: null,
      });

      const shoutout = toDomainShoutout(dbShoutout, {
        fromUser: mockFromUser,
        toUser: mockToUser,
        resource: mockResource,
      });

      expect(shoutout.impactDescription).toBeUndefined();
    });

    it("should handle empty image_urls array", () => {
      const mockFromUser = createMockUser();
      const mockToUser = createMockUser();
      const mockResource = createMockResource();
      const dbShoutout = createMockDbShoutout({
        from_user_id: mockFromUser.id,
        to_user_id: mockToUser.id,
        resource_id: mockResource.id,
        image_urls: [],
      });

      const shoutout = toDomainShoutout(dbShoutout, {
        fromUser: mockFromUser,
        toUser: mockToUser,
        resource: mockResource,
      });

      expect(shoutout.imageUrls).toEqual([]);
    });

    it("should throw an error if from user ID does not match", () => {
      const mockFromUser = createMockUser();
      const mockToUser = createMockUser();
      const mockResource = createMockResource();
      const dbShoutout = createMockDbShoutout({
        from_user_id: "different-id",
        to_user_id: mockToUser.id,
        resource_id: mockResource.id,
      });

      expect(() =>
        toDomainShoutout(dbShoutout, {
          fromUser: mockFromUser,
          toUser: mockToUser,
          resource: mockResource,
        }),
      ).toThrow("From user ID does not match");
    });

    it("should throw an error if to user ID does not match", () => {
      const mockFromUser = createMockUser();
      const mockToUser = createMockUser();
      const mockResource = createMockResource();
      const dbShoutout = createMockDbShoutout({
        from_user_id: mockFromUser.id,
        to_user_id: "different-id",
        resource_id: mockResource.id,
      });

      expect(() =>
        toDomainShoutout(dbShoutout, {
          fromUser: mockFromUser,
          toUser: mockToUser,
          resource: mockResource,
        }),
      ).toThrow("To user ID does not match");
    });

    it("should throw an error if resource ID does not match", () => {
      const mockFromUser = createMockUser();
      const mockToUser = createMockUser();
      const mockResource = createMockResource();
      const dbShoutout = createMockDbShoutout({
        from_user_id: mockFromUser.id,
        to_user_id: mockToUser.id,
        resource_id: "different-id",
      });

      expect(() =>
        toDomainShoutout(dbShoutout, {
          fromUser: mockFromUser,
          toUser: mockToUser,
          resource: mockResource,
        }),
      ).toThrow("Resource ID does not match");
    });

    it("should not return any field names with underscores", () => {
      // Arrange
      const mockFromUser = createMockUser();
      const mockToUser = createMockUser();
      const mockResource = createMockResource();
      const dbShoutout = createMockDbShoutout({
        from_user_id: mockFromUser.id,
        to_user_id: mockToUser.id,
        resource_id: mockResource.id,
      });

      // Act
      const result = toDomainShoutout(dbShoutout, {
        fromUser: mockFromUser,
        toUser: mockToUser,
        resource: mockResource,
      });

      // Assert
      const fieldNames = Object.keys(result);
      const underscoreFields = fieldNames.filter((name) => name.includes("_"));
      expect(underscoreFields).toEqual([]);
    });
  });

  describe("forDbInsert", () => {
    it("should transform domain shoutout data to database insert format", () => {
      const shoutoutData = createMockShoutoutData();
      const fromUserId = faker.string.uuid();

      const dbShoutout = forDbInsert(shoutoutData, fromUserId);

      expect(dbShoutout).toMatchObject({
        message: shoutoutData.message,
        from_user_id: fromUserId,
        to_user_id: shoutoutData.toUserId,
        resource_id: shoutoutData.resourceId,
        image_urls: shoutoutData.imageUrls || [],
        impact_description: shoutoutData.impactDescription || null,
      });
    });

    it("should handle undefined imageUrls", () => {
      const shoutoutData = createMockShoutoutData({
        imageUrls: undefined,
      });
      const fromUserId = faker.string.uuid();

      const dbShoutout = forDbInsert(shoutoutData, fromUserId);

      expect(dbShoutout.image_urls).toEqual([]);
    });

    it("should handle undefined impactDescription", () => {
      const shoutoutData = createMockShoutoutData({
        impactDescription: undefined,
      });
      const fromUserId = faker.string.uuid();

      const dbShoutout = forDbInsert(shoutoutData, fromUserId);

      expect(dbShoutout.impact_description).toBeNull();
    });
  });

  describe("forDbUpdate", () => {
    it("should transform partial domain shoutout data to database update format", () => {
      const partialShoutoutData = {
        message: faker.lorem.paragraph(),
        imageUrls: [faker.image.url()],
        impactDescription: faker.lorem.sentence(),
      };

      const dbShoutout = forDbUpdate(partialShoutoutData);

      expect(dbShoutout).toMatchObject({
        message: partialShoutoutData.message,
        image_urls: partialShoutoutData.imageUrls,
        impact_description: partialShoutoutData.impactDescription,
      });
    });

    it("should handle undefined values", () => {
      const partialShoutoutData = {
        message: faker.lorem.paragraph(),
      };

      const dbShoutout = forDbUpdate(partialShoutoutData);

      expect(dbShoutout).toMatchObject({
        message: partialShoutoutData.message,
        from_user_id: undefined,
        to_user_id: undefined,
        resource_id: undefined,
        image_urls: undefined,
        impact_description: null,
      });
    });

    it("should convert undefined impactDescription to null", () => {
      const partialShoutoutData = {
        impactDescription: undefined,
      };

      const dbShoutout = forDbUpdate(partialShoutoutData);

      expect(dbShoutout.impact_description).toBeNull();
    });
  });
});
