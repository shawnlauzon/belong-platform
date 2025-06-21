import { describe, it, expect } from "vitest";
import { faker } from "@faker-js/faker";
import {
  toDomainThanks,
  forDbInsert,
  forDbUpdate,
} from "../transformers/thanksTransformer";
import { createMockDbThanks, createMockThanksData } from "./test-utils";
import { createMockUser, createMockResource } from "../../test-utils/mocks";

describe("Thanks Transformer", () => {
  describe("toDomainThanks", () => {
    it("should transform a database thanks to a domain thanks", () => {
      const mockFromUser = createMockUser();
      const mockToUser = createMockUser();
      const mockResource = createMockResource();
      const dbThanks = createMockDbThanks({
        from_user_id: mockFromUser.id,
        to_user_id: mockToUser.id,
        resource_id: mockResource.id,
      });

      const thanks = toDomainThanks(dbThanks, {
        fromUser: mockFromUser,
        toUser: mockToUser,
        resource: mockResource,
      });

      expect(thanks).toMatchObject({
        id: dbThanks.id,
        message: dbThanks.message,
        imageUrls: dbThanks.image_urls,
        impactDescription: dbThanks.impact_description || undefined,
        fromUser: mockFromUser,
        toUser: mockToUser,
        resource: mockResource,
      });
      expect(thanks.createdAt).toBeInstanceOf(Date);
      expect(thanks.updatedAt).toBeInstanceOf(Date);
    });

    it("should include users and resource if provided", () => {
      const mockFromUser = createMockUser();
      const mockToUser = createMockUser();
      const mockResource = createMockResource();
      const dbThanks = createMockDbThanks({
        from_user_id: mockFromUser.id,
        to_user_id: mockToUser.id,
        resource_id: mockResource.id,
      });

      const thanks = toDomainThanks(dbThanks, {
        fromUser: mockFromUser,
        toUser: mockToUser,
        resource: mockResource,
      });

      expect(thanks.fromUser).toEqual(mockFromUser);
      expect(thanks.toUser).toEqual(mockToUser);
      expect(thanks.resource).toEqual(mockResource);
    });

    it("should handle null impact_description", () => {
      const mockFromUser = createMockUser();
      const mockToUser = createMockUser();
      const mockResource = createMockResource();
      const dbThanks = createMockDbThanks({
        from_user_id: mockFromUser.id,
        to_user_id: mockToUser.id,
        resource_id: mockResource.id,
        impact_description: null,
      });

      const thanks = toDomainThanks(dbThanks, {
        fromUser: mockFromUser,
        toUser: mockToUser,
        resource: mockResource,
      });

      expect(thanks.impactDescription).toBeUndefined();
    });

    it("should handle empty image_urls array", () => {
      const mockFromUser = createMockUser();
      const mockToUser = createMockUser();
      const mockResource = createMockResource();
      const dbThanks = createMockDbThanks({
        from_user_id: mockFromUser.id,
        to_user_id: mockToUser.id,
        resource_id: mockResource.id,
        image_urls: [],
      });

      const thanks = toDomainThanks(dbThanks, {
        fromUser: mockFromUser,
        toUser: mockToUser,
        resource: mockResource,
      });

      expect(thanks.imageUrls).toEqual([]);
    });

    it("should throw an error if from user ID does not match", () => {
      const mockFromUser = createMockUser();
      const mockToUser = createMockUser();
      const mockResource = createMockResource();
      const dbThanks = createMockDbThanks({
        from_user_id: "different-id",
        to_user_id: mockToUser.id,
        resource_id: mockResource.id,
      });

      expect(() =>
        toDomainThanks(dbThanks, {
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
      const dbThanks = createMockDbThanks({
        from_user_id: mockFromUser.id,
        to_user_id: "different-id",
        resource_id: mockResource.id,
      });

      expect(() =>
        toDomainThanks(dbThanks, {
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
      const dbThanks = createMockDbThanks({
        from_user_id: mockFromUser.id,
        to_user_id: mockToUser.id,
        resource_id: "different-id",
      });

      expect(() =>
        toDomainThanks(dbThanks, {
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
      const dbThanks = createMockDbThanks({
        from_user_id: mockFromUser.id,
        to_user_id: mockToUser.id,
        resource_id: mockResource.id,
      });

      // Act
      const result = toDomainThanks(dbThanks, {
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
    it("should transform domain thanks data to database insert format", () => {
      const thanksData = createMockThanksData();
      const fromUserId = faker.string.uuid();

      const dbThanks = forDbInsert(thanksData, fromUserId);

      expect(dbThanks).toMatchObject({
        message: thanksData.message,
        from_user_id: fromUserId,
        to_user_id: thanksData.toUserId,
        resource_id: thanksData.resourceId,
        image_urls: thanksData.imageUrls || [],
        impact_description: thanksData.impactDescription || null,
      });
    });

    it("should handle undefined imageUrls", () => {
      const thanksData = createMockThanksData({
        imageUrls: undefined,
      });
      const fromUserId = faker.string.uuid();

      const dbThanks = forDbInsert(thanksData, fromUserId);

      expect(dbThanks.image_urls).toEqual([]);
    });

    it("should handle undefined impactDescription", () => {
      const thanksData = createMockThanksData({
        impactDescription: undefined,
      });
      const fromUserId = faker.string.uuid();

      const dbThanks = forDbInsert(thanksData, fromUserId);

      expect(dbThanks.impact_description).toBeNull();
    });
  });

  describe("forDbUpdate", () => {
    it("should transform partial domain thanks data to database update format", () => {
      const partialThanksData = {
        message: faker.lorem.paragraph(),
        imageUrls: [faker.image.url()],
        impactDescription: faker.lorem.sentence(),
      };

      const dbThanks = forDbUpdate(partialThanksData);

      expect(dbThanks).toMatchObject({
        message: partialThanksData.message,
        image_urls: partialThanksData.imageUrls,
        impact_description: partialThanksData.impactDescription,
      });
    });

    it("should handle undefined values", () => {
      const partialThanksData = {
        message: faker.lorem.paragraph(),
      };

      const dbThanks = forDbUpdate(partialThanksData);

      expect(dbThanks).toMatchObject({
        message: partialThanksData.message,
        from_user_id: undefined,
        to_user_id: undefined,
        resource_id: undefined,
        image_urls: undefined,
        impact_description: null,
      });
    });

    it("should convert undefined impactDescription to null", () => {
      const partialThanksData = {
        impactDescription: undefined,
      };

      const dbThanks = forDbUpdate(partialThanksData);

      expect(dbThanks.impact_description).toBeNull();
    });
  });
});
